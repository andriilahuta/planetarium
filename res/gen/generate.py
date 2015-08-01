import os
import json
import re
from collections import OrderedDict


OUT_DIR = './out/'
RES_DIR = './res/'

INDENT = None

    
def generate_star_names():
    star_names = {}
    # use stellarium data
    with open(RES_DIR + 'stellarium/stars/bayer_names.fab', encoding="utf-8") as file:
        res = file.read().split('\n')
        for r in res:
            if not r: continue
            r = r.split('|')
            star_names[int(r[0])] = [r[1].replace('_', ' ')]

    with open(RES_DIR + 'stellarium/stars/western_names.fab') as file:
        res = file.read().split('\n')
        for r in res:
            if not r: continue
            r = r.split('|')
            id_ = int(r[0])
            star_names.get(id_, []).append(re.sub(r'[_(")]', '', r[1]))

    with open(OUT_DIR + 'star_names.js', 'w', encoding="utf-8") as rfile:
        rfile.write('var star_names = {\n')
        rfile.write('//id: Bayer, western\n')
        for k, v in sorted(star_names.items(), key=lambda x: x[0]):
            rec = json.dumps(v, ensure_ascii=False)
            rfile.write('{}: {},\n'.format(k, rec))
        rfile.write('};\n')    
    
    
def generate_star_data():
    def split_header(line):
        res = re.sub(r'<span.*</span>', '', line).split('|')
        res = [i.strip() for i in res if i]
        return res

    def split_val(line):
        res = re.sub(r'<a target.*">', '', line).split('|')
        res = [i.strip() for i in res if i]
        return res
        
    def write_file(suffix=''):
        with open(OUT_DIR + 'stars_mag_{}.js'.format(suffix), 'w') as rfile:
            rfile.write('var stars = [\n')
            rfile.write('//{}\n'.format(' '.join(header)))
            for r in records:
                r = split_val(r)
                try:
                    mag = float(r[13])
                    if isinstance(suffix, (int, float)) and mag > suffix: continue
                    rec = json.dumps([int(r[9]), float(r[11]), float(r[12]), mag, r[6]])
                    rfile.write('{},\n'.format(rec))
                except:
                    continue
            rfile.write('];\n')

    with open(RES_DIR + 'HEASARC Browse_ Text Display of Query Results.htm') as file:
        res = file.read().split('\n')
        header = res[192]
        records = res[193:118411]

        header = split_header(header)
        header = 'HIP_id ra(deg) dec(deg) magnitude spect_type'.split()

        for i in range(6, 10):
            write_file(i)
        write_file('full')
    
    
def generate_constellations():
    cons = {}
    with open(RES_DIR + 'stellarium/constellations/western_names.eng.fab') as file:
        res = file.read().split('\n')
        for l in res:
            r = l.split()
            if len(r) < 2: continue
            cons[r[0]] = {'name': r[1].strip('"'), 'stars': []}

    with open(RES_DIR + 'stellarium/constellations/constellationship.fab') as file:
        r = file.read().split()
        r = iter(r)
        try:
            while True:
                stars = []
                abr = next(r)
                num = int(next(r))
                for j in range(num):
                    stars.append([int(next(r)), int(next(r))])
                cons[abr]['stars'].extend(stars) # list of Hipparcos catalogue numbers which, when connected pairwise, form the lines of the constellation
        except StopIteration:
            pass

    with open(OUT_DIR + 'constellations.js', 'w') as rfile:
        rfile.write('var constellations = [\n')
        rfile.write('//Abbr   Name      List of Hipparcos catalogue numbers which, when connected pairwise, form the lines of the constellation\n')
        for k, v in cons.items():
            rfile.write(json.dumps([k, v['name'], v['stars']]) + ',\n')
        rfile.write('];\n')
        
        
def generate_planetary_orbits():
    earth = 'Earth 0.999996 99.556772 103.2055 0.016671 0.999985'.replace(u'\u2212', '-').split()
    data = \
'''Mercury 0.24085 75.5671 77.612 0.205627 0.387098 7.0051 48.449 6.74 −0.42
Venus 0.615207 272.30044 131.54 0.006812 0.723329 3.3947 76.769 16.92 −4.40
Mars 1.880765 109.09646 336.217 0.093348 1.523689 1.8497 49.632 9.36 −1.52
Jupiter 11.857911 337.917132 14.6633 0.048907 5.20278 1.3035 100.595 196.74 −9.40
Saturn 29.310579 172.398316 89.567 0.053853 9.51134 2.4873 113.752 165.60 −8.88
Uranus 84.039492 271.063148 172.884833 0.046321 19.21814 0.773059 73.926961 65.80 −7.19
Neptune 165.84539 326.895127 23.07 0.010483 30.1985 1.7673 131.879 62.20 −6.87'''.replace(u'\u2212', '-')
    
    data_dict = {}
    for line in data.split('\n'):
        cols = line.split()
        data_dict[cols[0]] = {
            'period': float(cols[1]),
            'epochLongitude': float(cols[2]),
            'perihelionLongitude': float(cols[3]),
            'eccentricity': float(cols[4]),
            'semiMajorAxis': float(cols[5]),
            'inclination': float(cols[6]),
            'ascendingNode': float(cols[7]),
            'angularDiameter': float(cols[8]),
            'visualMagnitude': float(cols[9]),
        }
        
    earth_dict = {'Earth': {
            'period': float(earth[1]),
            'epochLongitude': float(earth[2]),
            'perihelionLongitude': float(earth[3]),
            'eccentricity': float(earth[4]),
            'semiMajorAxis': float(earth[5]),    
    }}
        
    with open(OUT_DIR + 'planetary_orbits.json', 'w') as rfile:
        rfile.write(json.dumps(data_dict, indent=INDENT))
        rfile.write('\n')
        rfile.write(json.dumps(earth_dict, indent=INDENT))


def generate_vsop87c():
    def parse_body(body):
        pattern1 = r'[XYZ][0-5] ([+-])= (\d*\.?\d*)\*Math\.cos\((\d*\.?\d*) \+ (\d*\.?\d*)\*t\);'
        pattern2 = r'[XYZ][0-5] ([+-])= (\d*\.?\d*);'
        res = []
        found = re.findall(pattern1, body)
        for line in found:
            coeffs = []
            for coeff in line[1:]:
                coeffs.append(float(coeff))
            if line[0] == '-': coeffs[0] = -coeffs[0]
            res.append(coeffs)
        found = re.findall(pattern2, body)
        for line in found:
            n = float(line[1])
            if line[0] == '-': n = -n
            res.append(n)            
        return res
        
    res = OrderedDict()
    func_pattern = r'(?P<func>static double (?P<planet>[A-Z][a-z]+)_(?P<coord>[XYZ])(?P<level>[0-5]).*?\{(?P<body>.*?)\})'
    
    with open(RES_DIR + 'vsop87c.java') as file:
        tree = file.read().replace('\n', ' ')
        tree = re.findall(func_pattern, tree)
        # print(tree)
        for gr in tree:            
            planet = gr[1]
            coord = gr[2]
            level = gr[3]
            body = gr[4]

            res[planet] = res.get(planet, OrderedDict())
            res[planet][coord] = res[planet].get(coord, [])
            parsed_body = parse_body(body)
            if parsed_body: res[planet][coord].append(parsed_body)
        
    with open(OUT_DIR + 'planets.js', 'w') as rfile:
        rfile.write('var planets_data = ')
        rfile.write(json.dumps(res, indent=INDENT))
    
    
def main():
    if not os.path.exists(OUT_DIR):
        os.makedirs(OUT_DIR)

    generate_star_names()
    generate_star_data()
    generate_constellations()
    generate_planetary_orbits()
    generate_vsop87c()



if __name__ == '__main__':
    main()
