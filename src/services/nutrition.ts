import nutritionDatabase from "../data/foods.json";

export interface NutritionFood {
    id: number;
    code?: string;
    name: string;
    nameHindi?: string;
    category?: string;
    energy: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    source?: string;
    dataQuality?: string;
}

export interface IngredientAmount {
    food: string;
    grams: number;
}

export interface MatchedIngredient {
    requestedName: string;
    databaseName: string;
    grams: number;
}

export interface NutritionResult {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    matchedIngredients: MatchedIngredient[];
    unmatchedIngredients: string[];
    isComplete: boolean;
}

type NutritionDatabase = {
    foods?: NutritionFood[];
};

const database = nutritionDatabase as NutritionDatabase;

const foods: NutritionFood[] = Array.isArray(database.foods)
    ? database.foods
    : [];

const aliases: Record<string, string> = {
    poha: "Rice flakes",
    "flattened rice": "Rice flakes",
    "pressed rice": "Rice flakes",

    suji: "Wheat, semolina",
    semolina: "Wheat, semolina",

    atta: "Wheat flour, atta",
    "whole wheat flour": "Wheat flour, atta",
    "chapati flour": "Wheat flour, atta",

    dalia: "Wheat, bulgur",
    "broken wheat": "Wheat, bulgur",

    dahi: "Curd (Dahi)",
    curd: "Curd (Dahi)",
    yogurt: "Curd (Dahi)",
    yoghurt: "Curd (Dahi)",
    "plain yogurt": "Curd (Dahi)",
    "plain yoghurt": "Curd (Dahi)",

    chaas: "Buttermilk (Chaas)",
    buttermilk: "Buttermilk (Chaas)",

    "cow milk": "Milk, whole, Cow",
    "whole cow milk": "Milk, whole, Cow",
    "buffalo milk": "Milk, whole, Buffalo",

    carrot: "Carrot, orange",

    "brown rice": "Rice, raw, brown",
    "white rice": "Rice, raw, milled",

    oats: "Oats",
    paneer: "Paneer",

    "mustard oil": "Mustard Oil",
    "sunflower oil": "Sunflower Oil",
};

function normalizeName(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

export function findNutritionFood(
    requestedName: string,
): NutritionFood | null {
    const query = normalizeName(requestedName);

    if (!query || foods.length === 0) {
        return null;
    }

    const canonicalName = aliases[query] ?? requestedName;
    const target = normalizeName(canonicalName);

    const exactMatches = foods.filter(
        (food) => normalizeName(food.name) === target,
    );

    if (exactMatches.length === 1) {
        return exactMatches[0];
    }

    if (exactMatches.length > 1) {
        return null;
    }

    const prefixMatches = foods.filter((food) =>
        normalizeName(food.name).startsWith(`${target} `),
    );

    return prefixMatches.length === 1
        ? prefixMatches[0]
        : null;
}

export function calculateNutrition(
    ingredients: IngredientAmount[],
): NutritionResult {
    const result: NutritionResult = {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        matchedIngredients: [],
        unmatchedIngredients: [],
        isComplete: false,
    };

    for (const ingredient of ingredients) {
        const requestedName = ingredient.food?.trim() ?? "";
        const grams = Number(ingredient.grams);

        if (
            !requestedName ||
            !Number.isFinite(grams) ||
            grams <= 0 ||
            grams > 10000
        ) {
            result.unmatchedIngredients.push(
                requestedName || "Invalid ingredient or quantity",
            );
            continue;
        }

        const food = findNutritionFood(requestedName);

        if (!food) {
            result.unmatchedIngredients.push(requestedName);
            continue;
        }

        const factor = grams / 100;

        result.calories += food.energy * factor;
        result.protein += food.protein * factor;
        result.carbohydrates += food.carbs * factor;
        result.fat += food.fat * factor;
        result.fiber += food.fiber * factor;

        result.matchedIngredients.push({
            requestedName,
            databaseName: food.name,
            grams,
        });
    }

    const round = (value: number) =>
        Math.round(value * 10) / 10;

    result.calories = round(result.calories);
    result.protein = round(result.protein);
    result.carbohydrates = round(result.carbohydrates);
    result.fat = round(result.fat);
    result.fiber = round(result.fiber);

    result.isComplete =
        ingredients.length > 0 &&
        result.unmatchedIngredients.length === 0 &&
        result.matchedIngredients.length === ingredients.length;

    return result;
}

export const availableNutritionFoodNames = foods.map(
    (food) => food.name,
);