import unittest
import pandas as pd

from train_optimized import split_dataset


class TestTrainOptimized(unittest.TestCase):
    def test_split_dataset_80_20(self):
        data = {
            'f1': list(range(20)),
            'f2': [x * 2 for x in range(20)],
        }
        X = pd.DataFrame(data)
        y = pd.Series([0] * 14 + [1] * 6)

        X_train, X_test, y_train, y_test = split_dataset(
            X, y, test_size=0.2, stratify=True, random_state=42
        )

        self.assertEqual(len(X_train), 16)
        self.assertEqual(len(X_test), 4)
        self.assertEqual(len(y_train), 16)
        self.assertEqual(len(y_test), 4)

        # Verify the split is roughly 80/20 and stratified
        self.assertEqual(y_train.sum(), 5)
        self.assertEqual(y_test.sum(), 1)
        self.assertEqual(set(X_train.columns), set(X.columns))
        self.assertEqual(set(X_test.columns), set(X.columns))

    def test_split_dataset_no_stratify(self):
        data = {
            'f1': list(range(10)),
            'f2': [x * 2 for x in range(10)],
        }
        X = pd.DataFrame(data)
        y = pd.Series([0, 1] * 5)

        X_train, X_test, y_train, y_test = split_dataset(
            X, y, test_size=0.2, stratify=False, random_state=1
        )

        self.assertEqual(len(X_train), 8)
        self.assertEqual(len(X_test), 2)
        self.assertEqual(len(y_train), 8)
        self.assertEqual(len(y_test), 2)
        self.assertEqual(set(X_train.columns), set(X.columns))
        self.assertEqual(set(X_test.columns), set(X.columns))


if __name__ == '__main__':
    unittest.main()
