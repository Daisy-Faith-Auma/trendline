"""Builds src/shared/charts.ts from raw_data.py. Run: python3 tools/build_charts.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from raw_data import *

MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
def monthly(series, start_year, y0, m0, n):
    i0 = (y0 - start_year) * 12 + (m0 - 1)
    vals = series[i0:i0 + n]
    labels = [f"{MONTHS[(m0-1+k)%12]} {y0 + (m0-1+k)//12}" for k in range(n)]
    return labels, vals
def yearly(d, a, b):
    ys = list(range(a, b + 1))
    return [str(y) for y in ys], [d[y] for y in ys]
def quarterly(series, start_year, y0, nq):
    i0 = (y0 - start_year) * 12
    vals = [round(sum(series[i0+3*q:i0+3*q+3]) / 3, 1) for q in range(nq)]
    labels = [f"Q{q%4+1} {y0 + q//4}" for q in range(nq)]
    return labels, vals

charts = []
def add(id, title, unit, source, labels, values, visible, decimals, scale=1, fact=""):
    values = [round(v / scale, decimals) for v in values]
    assert len(labels) == len(values) and 4 <= visible < len(values) - 2
    charts.append(dict(id=id, title=title, unit=unit, source=source, labels=labels,
                       values=values, visible=visible, decimals=decimals, fact=fact))

add('ken-mobile', 'Mobile subscriptions in Kenya', 'per 100 people', 'World Bank (ITU)', *yearly(ken_mobile, 1998, 2024), 10, 1,
    fact='M-PESA launched in 2007. Kenya passed one subscription per person in 2019.')
add('airline-58', 'Airline passengers per month', 'thousands', 'Box & Jenkins airline data (1958 to 1960)', *monthly(airline, 1949, 1958, 1, 36), 24, 0,
    fact='The summer peak gets bigger every year as air travel grows.')
add('co2', 'CO2 in the air at Mauna Loa', 'ppm', 'NOAA Global Monitoring Laboratory', *yearly(co2, 1990, 2025), 22, 1,
    fact='The rise has sped up: about 1.5 ppm a year in the 1990s, about 2.5 now.')
add('jpn-pop', "Japan's population", 'millions', 'World Bank', *yearly(jpn_pop, 1980, 2024), 25, 2, scale=1e6,
    fact='Japan peaked around 2008 to 2010 and has shrunk every year since.')
add('irl-gdp', "Ireland's GDP growth", '% a year', 'World Bank', *yearly(irl_gdp, 1995, 2024), 19, 1,
    fact='The 24.6% jump in 2015 came from multinationals moving assets to Ireland, nicknamed "leprechaun economics".')
add('sunspots', 'Sunspots seen on the Sun', 'monthly average, by quarter', 'Monthly sunspot numbers, Hyndman Time Series Data Library', *quarterly(sunspots, 1940, 1949, 40), 22, 1,
    fact='Sunspots rise and fall on a roughly 11-year cycle. The 1957 to 1958 peak was one of the strongest on record.')
add('ken-life', 'Life expectancy in Kenya', 'years', 'World Bank', *yearly(ken_life, 1970, 2023), 21, 1,
    fact='HIV/AIDS cut Kenyan life expectancy through the 1990s. Treatment reversed the fall from around 2000.')
add('cars-66', 'New car sales in Quebec', 'cars per month', 'Abraham & Ledolter (1960s Quebec)', *monthly(cars, 1960, 1966, 1, 36), 24, 0,
    fact='Sales peak every spring, and each year sits a little higher than the last.')
add('gistemp', 'Global temperature', '°C vs 1951 to 1980 average', 'NASA GISTEMP', *yearly(gistemp, 1980, 2025), 30, 2,
    fact='2024 was the warmest year on record in this series.')
add('chn-fert', 'Births per woman in China', 'children', 'World Bank', *yearly(chn_fert, 1964, 2023), 22, 2,
    fact='China fell from more than 6 children per woman to about 1 in two generations.')
add('ken-internet', 'Internet users in Kenya', '% of population', 'World Bank (ITU)', *yearly(ken_internet, 1998, 2024), 14, 1,
    fact='Mobile data, not home broadband, drove most of the growth.')
add('tourism', 'International tourist arrivals worldwide', 'millions', 'World Bank (UN Tourism)', *yearly(tourism, 1995, 2019), 13, 0, scale=1e6,
    fact='The 2009 dip followed the financial crisis. Travel then grew every year until 2019.')
add('airline-49', 'Airline passengers per month', 'thousands', 'Box & Jenkins airline data (1949 to 1951)', *monthly(airline, 1949, 1949, 1, 36), 24, 0,
    fact='Even in 1951, July and August were the busiest months.')
add('ken-urban', "Kenya's urban population", 'millions', 'World Bank', *yearly(ken_urban, 1990, 2024), 12, 2, scale=1e6,
    fact='Growth sped up sharply in the early 2000s.')
add('cars-60', 'New car sales in Quebec', 'cars per month', 'Abraham & Ledolter (1960s Quebec)', *monthly(cars, 1960, 1960, 1, 36), 24, 0,
    fact='May 1962 hit 20,900 cars, the highest month in this window.')
add('co2-early', 'CO2 in the air at Mauna Loa', 'ppm', 'NOAA Global Monitoring Laboratory', *yearly(co2, 1959, 1994), 22, 1,
    fact='Charles Keeling began these measurements in 1958. The steady rise is called the Keeling Curve.')

for c in charts:
    lo, hi = min(c['values']), max(c['values'])
    span = (hi - lo) or abs(hi) or 1
    y_min = lo - span * 0.3
    if lo >= 0 and y_min < 0:
        y_min = 0  # counts and rates can't go below zero
    c['yMin'] = round(y_min, c['decimals'] + 1)
    c['yMax'] = round(hi + span * 0.3, c['decimals'] + 1)

out = os.path.join(os.path.dirname(__file__), '..', 'src', 'shared', 'charts.ts')
with open(out, 'w') as f:
    f.write('// Generated by tools/build_charts.py. Edit raw_data.py and re-run instead of editing by hand.\n')
    f.write("import type { Chart } from './types';\n\n")
    f.write('export const CHARTS: Chart[] = ' + json.dumps(charts, indent=2, ensure_ascii=False) + ';\n')
print(len(charts), 'charts written')
for c in charts: print(c['id'], len(c['values']), 'visible', c['visible'])
