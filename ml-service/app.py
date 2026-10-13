
import os
from contextlib import asynccontextmanager

import joblib
import numpy as np
import pandas as pd
import shap

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

MODEL_FEATURES = {
    "diabetes": [
        "age",
        "bmi",
        "activity",
        "sleep_hours",
        "family_diabetes",
    ],
    "heart": [
        "age",
        "bmi",
        "activity",
        "sleep_hours",
        "stress",
        "family_heart",
    ],
}


class HealthProfile(BaseModel):
    age: float = Field(ge=18, le=120)
    height: float = Field(gt=0, le=300)
    weight: float = Field(gt=0, le=500)

    activity: Literal[
        "Sedentary",
        "Lightly active",
        "Moderately active",
        "Very active",
    ]

    sleep: Literal[
        "Less than 5 hours",
        "5–6 hours",
        "7–8 hours",
        "More than 8 hours",
    ]

    stress: Literal["Low", "Moderate", "High"]

    familyHistory: str


def calculate_bmi(height, weight):
    return round(weight / ((height / 100) ** 2), 1)


def map_activity(value):
    return {
        "Sedentary": 0,
        "Lightly active": 1,
        "Moderately active": 2,
        "Very active": 3,
    }[value]


def map_sleep(value):
    return {
        "Less than 5 hours": 4.0,
        "5–6 hours": 5.5,
        "7–8 hours": 7.5,
        "More than 8 hours": 9.0,
    }[value]


def map_stress(value):
    return {
        "Low": 0,
        "Moderate": 1,
        "High": 2,
    }[value]


def parse_family_history(value):
    # Parse comma-separated values without treating "None" as a condition.
    return {
        item.strip().casefold()
        for item in value.split(",")
        if item.strip()
    }


def shap_for_predicted_class(explainer, input_data, class_index):
    """Return SHAP impacts for the class predicted by the model."""
    raw_values = explainer.shap_values(input_data)

    if isinstance(raw_values, list):
        values = np.asarray(raw_values[class_index])[0]

    else:
        values = np.asarray(raw_values)

        if values.ndim == 3:
            # Common format: samples, features, classes.
            if values.shape[2] > class_index:
                values = values[0, :, class_index]
            # Alternate format: classes, samples, features.
            elif values.shape[0] > class_index:
                values = values[class_index, 0, :]
            else:
                raise ValueError("Unexpected SHAP output shape.")

        elif values.ndim == 2:
            # One output per feature, for a single sample.
            values = values[0] if values.shape[0] == 1 else values[:, class_index]

        else:
            raise ValueError("Unexpected SHAP output dimensions.")

    return np.asarray(values, dtype=float).reshape(-1)


def predict_disease(model, explainer, disease, feature_values):
    features = MODEL_FEATURES[disease]

    input_data = pd.DataFrame(
        [{name: feature_values[name] for name in features}],
        columns=features,
    )

    predicted_label = str(model.predict(input_data)[0])
    class_index = list(model.classes_).index(predicted_label)

    probabilities = model.predict_proba(input_data)[0]

    # Probabilities are returned as percentages and may not sum to
    # exactly 100.00 because each value is rounded to two decimals.
    probability_result = {
        str(label): round(float(probability) * 100, 2)
        for label, probability in zip(model.classes_, probabilities)
    }

    impacts = shap_for_predicted_class(
        explainer,
        input_data,
        class_index,
    )

    if len(impacts) != len(features):
        raise ValueError("SHAP output does not match the model features.")

    explanations = []

    for feature, impact in zip(features, impacts):
        explanations.append({
            "feature": feature,
            "value": float(input_data.iloc[0][feature]),
            "impact": round(float(impact), 6),
        })

    explanations.sort(
        key=lambda item: abs(item["impact"]),
        reverse=True,
    )

    return {
        "risk_level": predicted_label,
        "probabilities": probability_result,
        "top_factors": explanations[:5],
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load each trained model and create each SHAP explainer once at startup.
    for disease in ("diabetes", "heart"):
        model_path = os.path.join(MODEL_DIR, f"{disease}_model.pkl")

        if not os.path.exists(model_path):
            raise RuntimeError(
                f"Missing {model_path}. Run `python train_models.py` first."
            )

        model = joblib.load(model_path)
        app.state.models[disease] = model
        app.state.explainers[disease] = shap.TreeExplainer(model)

    yield


app = FastAPI(
    title="YourArogyum ML Service",
    description=(
        "Separate diabetes and heart disease risk demonstrations "
        "using synthetic data, Random Forest, and SHAP."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.state.models = {}
app.state.explainers = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "YourArogyum ML Service",
        "status": "running",
    }


@app.post("/predict")
def predict(profile: HealthProfile, request: Request):
    bmi = calculate_bmi(profile.height, profile.weight)

    activity = map_activity(profile.activity)
    sleep_hours = map_sleep(profile.sleep)
    stress = map_stress(profile.stress)

    history = parse_family_history(profile.familyHistory)

    feature_values = {
        "age": profile.age,
        "bmi": bmi,
        "activity": activity,
        "sleep_hours": sleep_hours,
        "stress": stress,
        "family_diabetes": int("diabetes" in history),
        "family_heart": int(
            "heart disease" in history or "heart" in history
        ),
    }

    try:
        diabetes_result = predict_disease(
            request.app.state.models["diabetes"],
            request.app.state.explainers["diabetes"],
            "diabetes",
            feature_values,
        )

        heart_result = predict_disease(
            request.app.state.models["heart"],
            request.app.state.explainers["heart"],
            "heart",
            feature_values,
        )

    except (ValueError, KeyError, IndexError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction or explanation failed: {str(exc)}",
        ) from exc

    return {
        "bmi": bmi,
        "diabetes": diabetes_result,
        "heart": heart_result,
        "model": "Random Forest",
        "explainability": "SHAP",
        "data_notice": (
            "Predictions use synthetic demonstration data and are not "
            "clinically validated medical assessments."
        ),
    }
