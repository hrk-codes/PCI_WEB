/** Published financial-year turnover, in ₹ lakh. Add each new year at the end; the chart, figures and page intro follow. */
export const turnoverHistory = [
  ['2015–16', 766.34], ['2016–17', 2506.77], ['2017–18', 4986.64], ['2018–19', 12297.99], ['2019–20', 13128.31],
  ['2020–21', 11187.38], ['2021–22', 11867.24], ['2022–23', 12773.08], ['2023–24', 16524.41], ['2024–25', 27709.79],
  ['2025–26', 26528.53],
] as const

export const turnoverFirstYear = turnoverHistory[0][0]
export const turnoverLatestYear = turnoverHistory[turnoverHistory.length - 1][0]

/**
 * Keeps a page intro's year range in step with the data (so a CMS summary written before a new year was added still
 * reads correctly), and stops a range such as 2025–26 from breaking across lines at the dash.
 */
export function withTurnoverYears(text: string) {
  return text
    .replace(/(through|to)\s+\d{4}\s*[–-]\s*\d{2}/, `$1 ${turnoverLatestYear}`)
    .replace(/(\d{4})[–-](\d{2})\b/g, '$1⁠–⁠$2')
}
