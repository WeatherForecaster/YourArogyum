# Experiment 1: reproduction (seed 42)

## diabetes
{
 "generator_identical_to_train_model_py": true,
 "class_counts": {
  "Low": 1624,
  "Moderate": 1988,
  "High": 1388
 },
 "class_counts_match_manuscript": true,
 "missing_values": 0,
 "duplicate_feature_rows": 1,
 "test_rows_with_feature_vector_in_train": 1,
 "manuscript_vs_reproduced": {
  "rf_accuracy": [
   0.669,
   0.669
  ],
  "rf_macro_f1": [
   0.6765,
   0.6765
  ],
  "rf_auc": [
   0.8556,
   0.8556
  ],
  "lr_accuracy": [
   0.646,
   0.646
  ],
  "lr_auc": [
   0.8358,
   0.8358
  ],
  "rf_confusion_identical": true,
  "lr_confusion_identical": true
 }
}

- random_forest: acc 0.6690 | macro-F1 0.6765 | macro-AUC 0.8556
- logistic_regression: acc 0.6460 | macro-F1 0.6508 | macro-AUC 0.8358
- majority_class: acc 0.3970 | macro-F1 0.1895 | macro-AUC 0.5000
- tree_depth3: acc 0.6110 | macro-F1 0.6141 | macro-AUC 0.7857
- lr_on_rule_indicators: acc 0.6960 | macro-F1 0.7047 | macro-AUC 0.8666
- oracle_ceiling: acc 0.6980 | macro-F1 0.7065 | macro-AUC 0.8660

## heart
{
 "generator_identical_to_train_model_py": true,
 "class_counts": {
  "Low": 725,
  "Moderate": 1487,
  "High": 2788
 },
 "class_counts_match_manuscript": true,
 "missing_values": 0,
 "duplicate_feature_rows": 1,
 "test_rows_with_feature_vector_in_train": 0,
 "manuscript_vs_reproduced": {
  "rf_accuracy": [
   0.725,
   0.725
  ],
  "rf_macro_f1": [
   0.6845,
   0.6845
  ],
  "rf_auc": [
   0.8814,
   0.8814
  ],
  "lr_accuracy": [
   0.711,
   0.711
  ],
  "lr_auc": [
   0.8715,
   0.8715
  ],
  "rf_confusion_identical": true,
  "lr_confusion_identical": true
 }
}

- random_forest: acc 0.7250 | macro-F1 0.6845 | macro-AUC 0.8814
- logistic_regression: acc 0.7110 | macro-F1 0.6723 | macro-AUC 0.8715
- majority_class: acc 0.5580 | macro-F1 0.2388 | macro-AUC 0.5000
- tree_depth3: acc 0.6820 | macro-F1 0.6273 | macro-AUC 0.8194
- lr_on_rule_indicators: acc 0.7360 | macro-F1 0.6961 | macro-AUC 0.8917
- oracle_ceiling: acc 0.7400 | macro-F1 0.6901 | macro-AUC 0.8962
