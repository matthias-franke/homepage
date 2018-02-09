#!/usr/bin/env python
# -*- coding: utf-8 -*-
__author__ = 'manan'

import os
from numpy import genfromtxt
from datetime import datetime

captiva_path = 'P:\\GRM-CC\\Projekt_BWA_ComTS\\20_Rentenbescheide\\5_OCR_renten\\Captiva_output'
original_data_path = 'P:\\GRM-CC\\Projekt_BWA_ComTS\\20_Rentenbescheide\\5_OCR_renten\\original_data\\export2.dsv'
#original_data_path = os.path.join('C:\\', 'Users', 'cb2gano', 'export2.dsv')

fields_to_match = {}

fields_to_match['Image'] = 'DATEINAME'
fields_to_match['Dokumentart'] = 'DOKUMENTTYP'
fields_to_match['Versicherungsnummer'] = 'VERSICHERUNGSNUMMER'
fields_to_match['Anschrift_PLZ'] = 'PLZ'
fields_to_match['DatumBezugAb'] = 'DATUM'
fields_to_match['Gesamtbetrag'] = 'GESAMTBETRAG'
fields_to_match['Gesamtbetrag_Alt'] = 'GESAMTBETRAG_ALT'
fields_to_match['Brutto'] = 'MONATLICHE_RENTE'
fields_to_match['Brutto_Alt'] = 'MONATLICHE_RENTE_ALT'
fields_to_match['Rentenart'] = 'RENTENART1'
fields_to_match['Kundenname'] = 'VORNAME + NACHNAME'

def compare_numbers(num1, num2):
    try:
        num1 = num1.replace(',', '.')
        num2 = num2.replace(',', '.')
        num1 = float(num1)
        num2 = float(num2)

        if num1 == num2:
            return True
    except:
        return False
    return False


def calculate_accuracy(orig_data, captiva_data, file):
    output2 = ''
    accuracy = {}

    accuracy['Dokumentart'] = 0
    accuracy['Versicherungsnummer'] = 0
    accuracy['Anschrift_PLZ'] = 0
    accuracy['DatumBezugAb'] = 0
    accuracy['Gesamtbetrag'] = 0
    accuracy['Gesamtbetrag_Alt'] = 0
    accuracy['Brutto'] = 0
    accuracy['Brutto_Alt'] = 0
    accuracy['Rentenart'] = 0
    accuracy['Kundenname'] = 0

    accuracy['no_of_docs'] = 0

    #print orig_data.dtype.names
    #print captiva_data.dtype.names

    #print captiva_data['Gesamtbetrag']
    #return
    for i in range(0, len(captiva_data)):
        row = captiva_data[i]
        orig_row = None
        for j in range(0, len(orig_data)):
            if orig_data[j]['DATEINAME'] == row['Image']:
                orig_row = orig_data[j]
                break

        #print row
        #print orig_row
        #for key in fields_to_match.keys():
        output = ''
        if orig_row is not None:
            if row['Dokumentart'] == orig_row['DOKUMENTTYP']:
                accuracy['Dokumentart'] += 1
            else:
                output += 'Dokumentart : ' + row['Dokumentart'] + ' - '+ orig_row['DOKUMENTTYP']  + '\n'

            orig_row['VERSICHERUNGSNUMMER'] = orig_row['VERSICHERUNGSNUMMER'].replace(' ','')
            if row['Versicherungsnummer'] == orig_row['VERSICHERUNGSNUMMER']:
                accuracy['Versicherungsnummer'] += 1
            else:
                output += 'Versicherungsnummer : ' + row['Versicherungsnummer'] + ' - '+ orig_row['VERSICHERUNGSNUMMER']  + '\n'

            if row['Anschrift_PLZ'] == orig_row['PLZ']:
                accuracy['Anschrift_PLZ'] += 1
            else:
                output += 'Anschrift_PLZ : ' + str(row['Anschrift_PLZ']) + ' - ' + str(orig_row['PLZ'])  + '\n'

            orig_date = datetime.strptime(orig_row['DATUM'], '%d.%m.%y')
            try:
                captiva_date = datetime.strptime(row['DatumBezugAb'], '%d.%m.%Y')
                if orig_date == captiva_date:
                    accuracy['DatumBezugAb'] += 1
                else:
                    output +='DatumBezugAb : ' + row['DatumBezugAb']  + ' - ' + orig_row['DATUM']  + '\n'
            except:
                output +='DatumBezugAb : ' + row['DatumBezugAb']  + ' - ' + orig_row['DATUM']  + '\n'

            row['Gesamtbetrag'] = row['Gesamtbetrag'].replace('.', '')
            if row['Gesamtbetrag'] == orig_row['GESAMTBETRAG'] or compare_numbers(row['Gesamtbetrag'], orig_row['GESAMTBETRAG']):
                accuracy['Gesamtbetrag'] += 1
            else:
                output += 'Gesamtbetrag : ' + row['Gesamtbetrag'] + ' - ' + orig_row['GESAMTBETRAG']  + '\n'

            row['Gesamtbetrag_Alt'] = row['Gesamtbetrag_Alt'].replace('.', '')
            if row['Gesamtbetrag_Alt'] == orig_row['GESAMTBETRAG_ALT'] or compare_numbers(row['Gesamtbetrag_Alt'], orig_row['GESAMTBETRAG_ALT']):
                accuracy['Gesamtbetrag_Alt'] += 1
            else:
                output += 'Gesamtbetrag_Alt : ' + row['Gesamtbetrag_Alt'] + ' - '+ orig_row['GESAMTBETRAG_ALT'] + '\n'

            row['Brutto'] = row['Brutto'].replace('.', '')
            if row['Brutto'] == orig_row['MONATLICHE_RENTE'] or compare_numbers(row['Brutto'], orig_row['MONATLICHE_RENTE']):
                accuracy['Brutto'] += 1
            else:
                output += 'Brutto : ' + row['Brutto'] + ' - '+ orig_row['MONATLICHE_RENTE'] + '\n'

            row['Brutto_Alt'] = row['Brutto_Alt'].replace('.', '')
            if row['Brutto_Alt'] == orig_row['MONATLICHE_RENTE_ALT'] or compare_numbers(row['Brutto_Alt'], orig_row['MONATLICHE_RENTE_ALT']):
                accuracy['Brutto_Alt'] += 1
            else:
                output += 'Brutto_Alt : ' + row['Brutto_Alt'] + ' - '+ orig_row['MONATLICHE_RENTE_ALT'] + '\n'

            if row['Rentenart'].lower() == orig_row['RENTENART1'].lower():
                accuracy['Rentenart'] += 1
            else:
                output += 'Rentenart : ' + row['Rentenart'] + ' - '+ orig_row['RENTENART1'] + '\n'

            if row['Kundenname'].lower() == (orig_row['VORNAME'] + ' ' + orig_row['NACHNAME']).lower() :#or row['Kundenname'] == orig_row['NACHNAME'] + ' ' + orig_row['VORNAME']:
                accuracy['Kundenname'] += 1
            else:
                output += 'Kundenname : ' + row['Kundenname'] + ' - '+ orig_row['VORNAME'] + ' ' + orig_row['NACHNAME']  + '\n'
            accuracy['no_of_docs'] += 1

            if output != '':
                output2 += 'Document : ' + row['Image'] + '\n' + output + '\n'

    #print accuracy
    accuracy_str = 'ACCURACY (%) OF OCR ON RENTNERBESCHEIDE : \n\n'
    for key in accuracy.keys():
        if key == 'no_of_docs':
            continue
        accuracy_str += key + ' : ' + str(round((accuracy[key] * 100.0)/accuracy['no_of_docs'], 2)) + '\n'

    output =  accuracy_str + '\n\n'
    output += 'ACCURACY (IN NUMBERS) OF OCR ON RENTNERBESCHEIDE : \n\n'
    output += str(accuracy) + '\n\n'
    output += 'Detailed report (Values in the left represents what captiva reported and values in the right represents the ground truth): \n\n '
    output += output2
    print(output)
    file = open(os.path.join(captiva_path, file + '_report.txt'), 'w+')
    file.write(output)
    file.close()


#print os.path.join('C:\\', 'Users', 'cb2gano', 'export.csv')
orig_data = genfromtxt(original_data_path, dtype=None, delimiter="\t", names=True)
#print orig_data
#print orig_data.dtype.names

for file in os.listdir(captiva_path):
    if file.endswith(".csv") and not file.endswith('original.csv'):
#if True:
    #if True:
        #file = 'MA_KredExtr_TestStdImp_23193533_456800.csv' #'MA_KredExtr_TestStdImp_31101840_461100.csv'
        file_path = os.path.join(captiva_path, file)
        f = open(file_path)
        captiva_data = genfromtxt(file_path, dtype=None, delimiter="\t", names=True)
        calculate_accuracy(orig_data, captiva_data, file)