export const toTitleCaseTR = (str) => {
  if (!str) return "";
  const map = { i: "İ", ı: "I", ş: "Ş", ğ: "Ğ", ü: "Ü", ö: "Ö", ç: "Ç" };
  let lower = str.toLocaleLowerCase("tr-TR");
  return lower.replace(/(^|\s|-)([a-zğüşöçıi])/gi, (match, sep, ch) => {
    const key = ch.toLocaleLowerCase("tr-TR");
    return sep + (map[key] || ch.toLocaleUpperCase("tr-TR"));
  });
};