#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os, shutil, xml.etree.ElementTree
import filecmp
from datetime import datetime
from os.path import isfile

# list1 = ['physics', 'chemistry', 1997, 2000];
# tup1 = ('physics', 'chemistry', 1997, 2000);
# dict = {'Name': 'Zara', 'Age': 7, 'Class': 'First'}

relativeInputPath = '\\..\\test2'
relativeTemplatePath = '\\..\\test2'
relativeOutputPath = '\\..\\testOUT'

inputExtentions = ['.htm', '.html']

insertXPathTmp_TagStart = '<!--+'
insertXPathTmp_DelFileXPath = ' '
insertXPathTmp_TagEnd= '-->'

maxCopyAttempts = 100

def backupFile(f, f_new):
    if os.path.exists(f_new):
        i = 0
        while i < maxCopyAttempts and os.path.exists(f_new):
            f_new = f + datetime.now().strftime("%Y-%m-%d_%H%M%S") + '_' + str(i).zfill(2)  #%f
            #print('try: ' + f_new)    
            i = i + 1                    
    if not os.path.exists(f_new):
        if os.path.exists(f):
            shutil.copyfile(f, f_new) 
            print('backup: ' + f_new)    
            return True
        else:
            print('backup2: ' + f_new)    
            return True
    else:
        print('backup false: ' + f_new)    
        return False
		
def writeFile(f, listOfSections):
    if backupFile(f, f) is True:
        with open(f, 'w') as file:
            for section in listOfSections: 
                file.write(section)
        print('write: ' + f)		
    else:
        print('ERROR: can not backup: ' + f)

templates = {}

def getTmp(fileAndXpath, templatePath):
    #print(' |-->' + fileAndXpath)
    if fileAndXpath in templates:
        #print(' return form dict |-->' + templates[fileAndXpath])
        return templates[fileAndXpath]
    else:
        file, xpath = fileAndXpath.split(insertXPathTmp_DelFileXPath)
        #print(' file: ' + file + ', xpath: ' + xpath)
        root = xml.etree.ElementTree.parse(templatePath + '\\' + file)
        reBin = root.find(xpath)
        #re = reBin 
        if reBin is not None:
            re = xml.etree.ElementTree.tostring(reBin).decode()
            templates[fileAndXpath] = re
            #print(' return form file |-->' + re)
            return re
        return None		
        
def processFile(f, templatePath):
    listOfSections = ['']
    with open( f, 'r') as file:
        i = 0
        for line in file: 
            tagStart = line.find(insertXPathTmp_TagStart)
            if tagStart == 0:
                tagStartLen = len(insertXPathTmp_TagStart)
                lineEnd = line[tagStart + tagStartLen:]
                tagEnd = lineEnd.find(insertXPathTmp_TagEnd)
                if tagEnd > -1:
                    tmp = getTmp(lineEnd[:tagEnd], templatePath)
                    if tmp is not None:
                        listOfSections[i] += line[:tagStart]
                        listOfSections.append(tmp)
                        listOfSections.append(lineEnd[tagEnd + len(insertXPathTmp_TagEnd):])
                        i = i + 2                    
                    else:
                        print('no template ' + lineEnd[:tagEnd] + ' found for ' + f )
                        listOfSections[i] += line
                else:
                    listOfSections[i] += line
            else:
                listOfSections[i] += line
    return listOfSections
                    
def processFolder(inputPath, outputPath, templatePath):
    for unqualifiedFile in os.listdir(inputPath):
        file = os.path.join(inputPath, unqualifiedFile)
        if os.path.isfile(file):
            #print('file: ' + file)
            for ext in inputExtentions:
                if file.endswith(ext):
                    result = processFile(file, templatePath)
                    file_out = os.path.join(outputPath, unqualifiedFile)
                    if len(result) > 1:
                        print('wwwwww')
                        writeFile(file_out, result)
                    else:						
                        if not os.path.exists(file_out) or not filecmp.cmp(file, file_out):
                            print('nothing todo but copy')
                            backupFile(file, file_out)
                        else:
                            print('nothing todo')
                    break                
        else:
            #print('folder: ' + file)
            outputPathChild = os.path.join(outputPath, unqualifiedFile)
            if not os.path.exists(outputPathChild):
                print('ERROR: outputPath does not exist: ' + outputPathChild)
                return
            processFolder(file, outputPathChild, templatePath)
    """
    for key in templates.keys():
        print()
        print('############################################################')
        print(key + ':')
        print('------------------------------------------------------------')
        print(templates[key])
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
    """

def main(basePath):
    inputPath = os.path.normpath(basePath + relativeInputPath)
    if not os.path.exists(inputPath):
        print('ERROR: inputPath does not exist: ' + inputPath)
        return    
    outputPath = os.path.normpath(basePath + relativeOutputPath)
    if not os.path.exists(outputPath):
        print('ERROR: outputPath does not exist: ' + outputPath)
        return    
    if inputPath == outputPath:
        print('ERROR: inputPath equals outputPath: ' + inputPath)
        return
    templatePath = os.path.normpath(basePath + relativeTemplatePath)
    if not os.path.exists(templatePath):
        print('ERROR: templatePath does not exist: ' + templatePath)
        return
    processFolder(inputPath, outputPath, templatePath)
    processFolder(outputPath, outputPath, templatePath)

#print (sys.version_info)
print('')
print('############################################################')
main( os.path.dirname(os.path.abspath(__file__)) )
print('############################################################')

templates4File = dict()#{'x':[]}

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


