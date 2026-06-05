export const SIZE_GROUPS = {
  STANDART: ["SXS", "SS", "SM", "SL", "SXL", "S2XL", "S3XL"],
  BEBEK:    ["B3M", "B6M", "B9M", "B12M", "B18M", "B24M", "B3Y", "B4Y", "B5Y", "B6Y"],
  COCUK:    ["K2Y", "K3Y", "K4Y", "K5Y", "K6Y", "K7Y", "K8Y", "K9Y", "K10Y", "K11Y", "K12Y", "KXS", "KS", "KM", "KL"],
  YETISKIN: ["Y3XS", "Y2XS", "YXS", "YS", "YM", "YL", "YXL", "Y2XL", "Y3XL", "Y4XL", "YI", "YII", "YSTD"],
  UK:       ["U8", "U10", "U12", "U14", "U16", "U18"],
  NUMERIC:  ["N34", "N36", "N38", "N40", "N42", "N44", "N46", "N48", "N50", "N52", "N54", "N56", "N58", "N60", "N62"],
};

export const SIZE_ORDER = [
  'B3M', 'B6M', 'B9M', 'B12M', 'B18M', 'B24M', 'B3Y', 'B4Y', 'B5Y', 'B6Y',
  'K2Y', 'K3Y', 'K4Y', 'K5Y', 'K6Y', 'K7Y', 'K8Y', 'K9Y', 'K10Y', 'K11Y', 'K12Y', 'KXS', 'KS', 'KM', 'KL',
  'SXS', 'SS', 'SM', 'SL', 'SXL', 'S2XL', 'S3XL',
  'Y3XS', 'Y2XS', 'YXS', 'YS', 'YM', 'YL', 'YXL', 'Y2XL', 'Y3XL', 'Y4XL', 'YI', 'YII', 'YSTD',
  'U8', 'U10', 'U12', 'U14', 'U16', 'U18',
  'N34', 'N36', 'N38', 'N40', 'N42', 'N44', 'N46', 'N48', 'N50', 'N52', 'N54', 'N56', 'N58', 'N60', 'N62'
];
export const DEFAULT_QTY_BY_SIZE = Object.fromEntries(
  SIZE_ORDER.map(size => [size, 0])
);