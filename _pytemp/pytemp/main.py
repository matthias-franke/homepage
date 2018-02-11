#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os#, libxml2
import xml.etree.ElementTree as et
from os.path import isfile

# list1 = ['physics', 'chemistry', 1997, 2000];
# tup1 = ('physics', 'chemistry', 1997, 2000);
# dict = {'Name': 'Zara', 'Age': 7, 'Class': 'First'}

templates4File = dict()#{'x':[]}

def processFile(f):
    re = ['']
    with open( f, 'r') as file:
        i = 0
        for line in file: 
            tagStart = line.find('<!--+')
            if tagStart == 0:
                re.append(getTmp(line))
                re.append('')
                i = i + 2
            else:
                re[i] += line
    return re

def getTmp(fileAndXpath):
    print(' fileAndXpath1: ' + fileAndXpath)
    fileAndXpath = fileAndXpath[5:]
    print(' fileAndXpath2: ' + fileAndXpath)
    fileAndXpath = fileAndXpath[:-4]
    print(' fileAndXpath3: ' + fileAndXpath)
    file, xpath = fileAndXpath.split(' ')
    root = et.parse(file)
    re = root.find(xpath)
    """
    x1 = root.findall('body')
    x2 = root.findall('body/')
    x3 = root.findall('//body')
    x4 = root.findall('//body/')
    x5 = root.findall('.//body')
    x6 = root.findall('.//body/')
    """
    #for char in x:
    #print(' |-->' + et.tostring(re).decode()) #, encoding='utf8', method='xml'
    return et.tostring(re).decode()

def writeFile(f, l):
    with open( f, 'w') as file:
        for line in l: 
            file.write(line)

templates = {}

def readFile1(f):
    with open( f, 'r') as file:
        tempTemplates = {}
        for line in file: 
            cursor = 0
            tagStart = line.find('<!--')
            tagEnd = 0
            while tagStart > -1:
                tagStart = tagStart + 4
                tagEnd = line.find('-->', tagStart)
                if tagEnd > -1:
                    tag = line[tagStart:tagEnd]
                    tagEnd = tagEnd + 3
                    print(' tag: ' + tag)
                    if tag[:1] == '/':
                        tag = tag[1:]
                        if tag in tempTemplates:
                            tempTemplates[tag] += line[cursor:tagEnd]
                            templates[tag] = tempTemplates[tag]
                            del tempTemplates[tag]
                        else:
                            print(' error: ' + tag + ' missing opening tag')
                    else:
                        if tag in tempTemplates:
                            print(' error: ' + tag + ' dublicate opening tag')
                        else:
                            if tag in templates:
                                print(' error: ' + tag + ' dublicate')
                            else:
                                for key in tempTemplates.keys():
                                    tempTemplates[key] += line[cursor:tagEnd]
                                tempTemplates[tag] = '<!--' + tag + '-->'
                                cursor = tagEnd;
                    tagStart = line.find('<!--', tagEnd)
                else:
                    print(' warning missing tags end: ' + line)
                    tagStart = -1
                    tagEnd = 0
            for key in tempTemplates.keys():
                tempTemplates[key] += line[tagEnd:] #+ '\n'                 
        for key in tempTemplates.keys():
            print(' warning ' + key + ' missing closing tag' )
        del tempTemplates                  

def main(path):
    for unqualifiedFile in os.listdir(path):
        file = os.path.join(path, unqualifiedFile)
        file_out = os.path.join(path, unqualifiedFile + '.out')
        if os.path.isfile(file):
            print('file: ' + file)
            if file.endswith('.html') or file.endswith('.htm'):
                result = processFile(file)
                writeFile(file_out, result)
        else:
            print('folder: ' + file)
            main( file )
    """
    for key in templates.keys():
        print()
        print('############################################################')
        print(key + ':')
        print('------------------------------------------------------------')
        print(templates[key])
    """
    for key in templates4File.keys():
        print()
        print('############################################################')
        print(key + ':')
        print('------------------------------------------------------------')
        i = 0
        for section in templates4File[key]:
            print(str(i) + ': -------------------------------------------------')
            print(section)
            i = i + 1


print (sys.version_info)
main( os.path.dirname(os.path.abspath(__file__)) )
