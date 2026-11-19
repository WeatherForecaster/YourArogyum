# Experiment 2: variability (30 regenerated datasets; repeated 5-fold CV)

## diabetes (mean ± SD across 30 seeds; 95% t-interval of the mean)
- random_forest: acc 0.6559±0.0155 [0.6501,0.6617] | macro-F1 0.6643±0.0151 | macro-AUC 0.8489±0.0094
- logistic_regression: acc 0.6421±0.0183 [0.6353,0.6490] | macro-F1 0.6484±0.0179 | macro-AUC 0.8319±0.0096
- lr_on_rule_indicators: acc 0.6810±0.0138 [0.6759,0.6862] | macro-F1 0.6899±0.0132 | macro-AUC 0.8592±0.0084
- oracle_ceiling: acc 0.6877±0.0130 [0.6828,0.6925] | macro-F1 0.6960±0.0127 | macro-AUC 0.8590±0.0076
- RF-LR accuracy: mean +0.0137, 95% CI [+0.0079,+0.0196], Wilcoxon p=3.05e-04, RF better in 22/30
- RF-LR macro_f1: mean +0.0159, 95% CI [+0.0100,+0.0219], Wilcoxon p=1.82e-05, RF better in 23/30
- RF-LR macro_auc: mean +0.0169, 95% CI [+0.0144,+0.0195], Wilcoxon p=1.86e-09, RF better in 30/30
- oracle - RF accuracy: mean +0.0318, 95% CI [+0.0278,+0.0358]
- oracle - RF macro_f1: mean +0.0317, 95% CI [+0.0278,+0.0356]
- oracle - RF macro_auc: mean +0.0101, 95% CI [+0.0082,+0.0121]

## heart (mean ± SD across 30 seeds; 95% t-interval of the mean)
- random_forest: acc 0.7275±0.0145 [0.7221,0.7329] | macro-F1 0.6925±0.0169 | macro-AUC 0.8915±0.0084
- logistic_regression: acc 0.7115±0.0147 [0.7060,0.7169] | macro-F1 0.6792±0.0160 | macro-AUC 0.8793±0.0088
- lr_on_rule_indicators: acc 0.7385±0.0132 [0.7336,0.7434] | macro-F1 0.7019±0.0151 | macro-AUC 0.8995±0.0075
- oracle_ceiling: acc 0.7610±0.0130 [0.7562,0.7659] | macro-F1 0.7186±0.0159 | macro-AUC 0.9056±0.0063
- RF-LR accuracy: mean +0.0160, 95% CI [+0.0106,+0.0214], Wilcoxon p=2.82e-05, RF better in 27/30
- RF-LR macro_f1: mean +0.0134, 95% CI [+0.0066,+0.0201], Wilcoxon p=1.89e-04, RF better in 25/30
- RF-LR macro_auc: mean +0.0122, 95% CI [+0.0092,+0.0152], Wilcoxon p=2.61e-08, RF better in 28/30
- oracle - RF accuracy: mean +0.0335, 95% CI [+0.0286,+0.0385]
- oracle - RF macro_f1: mean +0.0260, 95% CI [+0.0206,+0.0315]
- oracle - RF macro_auc: mean +0.0141, 95% CI [+0.0119,+0.0163]

## Repeated 5-fold CV on seed-42 data (3 repeats, 15 folds)
- diabetes/random_forest: accuracy 0.6630±0.0175, macro_f1 0.6701±0.0172, macro_auc 0.8488±0.0098
- diabetes/logistic_regression: accuracy 0.6369±0.0153, macro_f1 0.6427±0.0146, macro_auc 0.8337±0.0087
- heart/random_forest: accuracy 0.7267±0.0208, macro_f1 0.6869±0.0211, macro_auc 0.8901±0.0101
- heart/logistic_regression: accuracy 0.7122±0.0151, macro_f1 0.6751±0.0142, macro_auc 0.8769±0.0087