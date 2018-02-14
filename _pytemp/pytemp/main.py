#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os, shutil, xml.etree.ElementTree
import filecmp
import itertools as IT
import io
from datetime import datetime
from os.path import isfile
#from sets import Set

# list1 = ['physics', 'chemistry', 1997, 2000];
# tup1 = ('physics', 'chemistry', 1997, 2000);
# dict = {'Name': 'Zara', 'Age': 7, 'Class': 'First'}

relativePathOutput = '\\..\\..\\franke-matthias.de'
relativePathInput = '\\..\\..\\franke-matthias.de_input'

relativePathTemplate = '\\..\\..\\franke-matthias.de_template'

pathExtBkp = 'bkp'

extentionsInput = ['.htm', '.html']
extentionsTemplate = ['.htm', '.html', '.xml', '.txt']

insertTmp_TagMarker = '+'
insertXPathTmp_TagStart = '<!--' + insertTmp_TagMarker
insertXPathTmp_DelimiterFileXPath = ' '
insertXPathTmp_TagEnd= '-->'

maxCopyAttempts = 99
maxLoops = 9

templates = dict() #{}
finishedFiles = set()
backupedFiles = set()

def readTemplate(f):
    with open( f, 'r') as file:
        tempTemplates = {}
        for line in file: 
            cursor = 0
            tagStart = line.find('<!--')
            tagEnd = 0
            while tagStart > -1:
                tagAfterStart = tagStart + 4
                tagEnd = line.find('-->', tagAfterStart)
                if tagEnd > -1:
                    tag = line[tagAfterStart:tagEnd].strip()
                    tagAfterEnd = tagEnd + 3
                    #print(' tag: ' + tag)
                    if tag[:1] == '/':
                        tag = tag[1:].strip()
                        if tag.find(' ') == -1:
                            if tag in tempTemplates:
                                tempTemplates[tag] += line[cursor:tagStart]
                                templates[tag] = tempTemplates[tag]
                                del tempTemplates[tag]
                            else:
                                print('ERROR: ' + tag + ' missing opening tag')
                    else:
                        if tag[:1] != insertTmp_TagMarker and tag.find(' ') == -1:
                            if tag in tempTemplates:
                                print('ERROR: ' + tag + ' dublicate opening tag')
                            else:
                                if tag in templates:
                                    print('ERROR: ' + tag + ' dublicate')
                                else:
                                    for key in tempTemplates.keys():
                                        tempTemplates[key] += line[cursor:tagAfterEnd]
                                    tempTemplates[tag] = ''#'<!--' + tag + '-->'
                                    cursor = tagAfterEnd;
                                    if line[cursor:] == '\n':
                                        cursor = cursor + 1
                                        break
                    tagStart = line.find('<!--', tagAfterEnd)
                else:
                    print('WARNING: missing tags end at ' + line)
                    tagStart = -1
                    #-----tagEnd = 0
            for key in tempTemplates.keys():
                tempTemplates[key] += line[cursor:] #+ '\n'                 
        for key in tempTemplates.keys():
            print('WARNING ' + key + ' missing closing tag' )
        del tempTemplates

def readTemplates(templatePath):
    for unqualifiedFile in os.listdir(templatePath):
        file = os.path.join(templatePath, unqualifiedFile)
        if os.path.isfile(file):
            #print('file: ' + file)
            for ext in extentionsTemplate:
                if file.endswith(ext):
                    readTemplate(file)

def backupFile(pathCpy, unqualFileCpy):
    if not os.path.exists(pathCpy):
        os.makedirs(pathCpy)      
    fileCpy = os.path.join(pathCpy, unqualFileCpy)
    if fileCpy not in backupedFiles:
        if os.path.exists(fileCpy):
            pathBkp = os.path.join(pathCpy, pathExtBkp)
            if not os.path.exists(pathBkp):
                os.makedirs(pathBkp)
            i = 0
            f_new = os.path.join(pathBkp, datetime.now().strftime("%Y-%m-%d_%H%M") + '_' + str(i).zfill(2) + '_' + unqualFileCpy) #%S%f
            while os.path.exists(f_new):
                if i > maxCopyAttempts:
                    print('ERROR can not backup ' + fileCpy)
                    return False
                f_new = os.path.join(pathBkp, datetime.now().strftime("%Y-%m-%d_%H%M") + '_' + str(i).zfill(2) + '_' + unqualFileCpy) #%S%f
                i = i + 1 
            shutil.copyfile(fileCpy, f_new)
    backupedFiles.add(fileCpy)
    return True
		
def cpyFile(f, pathCpy, unqualFileCpy):
    if os.path.exists(f):
        if not os.path.exists(pathCpy):
            os.makedirs(pathCpy)  
        fileCpy = os.path.join(pathCpy, unqualFileCpy)
        if f != fileCpy:
            if backupFile(pathCpy, unqualFileCpy) is True:
                shutil.copyfile(f, fileCpy)
    
def writeFile(path, unqualifiedFile, listOfSections):
    f = os.path.join(path, unqualifiedFile)
    qualPathBkp = os.path.join(path, pathExtBkp)
    if backupFile(path, unqualifiedFile) is True:
        with open(f, 'w') as file:
            for section in listOfSections: 
                file.write(section)

def getTemplate(tag, templatePath):
    #print(' |-->' + fileAndXpath)
    if tag in templates:
        #print(' return form dict |-->' + templates[fileAndXpath])
        return templates[tag]
    else:
        if tag.find(insertXPathTmp_DelimiterFileXPath) > -1:
            file, xpath = tag.split(insertXPathTmp_DelimiterFileXPath)
            #print(' file: ' + file + ', xpath: ' + xpath)
            reBin = None
            try:
                root = xml.etree.ElementTree.parse(templatePath + '\\' + file)
                reBin = root.find(xpath)
            except xml.etree.ElementTree.ParseError as err:
                print('ERROR ParseError: ' + str(err) + ' in ' + file)
            if reBin is not None:
                re = xml.etree.ElementTree.tostring(reBin).decode()
                templates[tag] = re
                #print(' return form file |-->' + re)
                return re
        else:
            print('ERROR unknown template: ' + tag)
    return None		
        
def processFile(f, templatePath):
    listOfSections = ['']
    with open(f, 'r') as file:
        i = 0
        for line in file: 
            tagStart = line.find(insertXPathTmp_TagStart)
            if tagStart > -1:
                tagStartLen = len(insertXPathTmp_TagStart)
                lineEnd = line[tagStart + tagStartLen:]
                tagEnd = lineEnd.find(insertXPathTmp_TagEnd)
                if tagEnd > -1:
                    tmp = getTemplate(lineEnd[:tagEnd].strip(), templatePath)
                    if tmp is not None:
                        listOfSections[i] += line[:tagStart]
                        listOfSections.append(tmp)
                        listOfSections.append(lineEnd[tagEnd + len(insertXPathTmp_TagEnd):])
                        i = i + 2                    
                    else:
                        print('WARNING: no template ' + lineEnd[:tagEnd] + ' found for ' + f )
                        listOfSections[i] += line
                else:
                    listOfSections[i] += line
            else:
                listOfSections[i] += line
    return listOfSections
                 
def processFolder(inputPath, outputPath, templatePath):
    templates.clear()
    readTemplates(templatePath)
    """
    for tag in templates:
        print(' . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .')
        print(tag)
    """
    re = False
    for unqualifiedFile in os.listdir(inputPath):
        file = os.path.join(inputPath, unqualifiedFile)
        if os.path.isfile(file):
            #print('file: ' + file)
            if file not in finishedFiles:
                for ext in extentionsInput:
                    if file.endswith(ext):
                        result = processFile(file, templatePath)
                        if len(result) > 1:
                            writeFile(outputPath, unqualifiedFile, result)
                            re = True
                        else:            
                            #if not filecmp.cmp(file, os.path.join(outputPath, unqualifiedFile)):
                            cpyFile(file, outputPath, unqualifiedFile)
                            finishedFiles.add(file)
                        break                
        else:
            if unqualifiedFile != pathExtBkp:
                outputPathChild = os.path.join(outputPath, unqualifiedFile)
                if not os.path.exists(outputPathChild):
                    os.makedirs(outputPathChild)
                if not os.path.exists(outputPathChild):
                    print('ERROR: outputPath does not exist: ' + outputPathChild)
                    return False
                if processFolder(file, outputPathChild, templatePath):
                    re = True
    return re

def main(basePath):
    inputPath = os.path.normpath(basePath + relativePathInput)
    if not os.path.exists(inputPath):
        print('ERROR: inputPath does not exist: ' + inputPath)
        return    
    outputPath = os.path.normpath(basePath + relativePathOutput)
    if not os.path.exists(outputPath):
        print('ERROR: outputPath does not exist: ' + outputPath)
        return    
    if inputPath == outputPath:
        print('ERROR: inputPath equals outputPath: ' + inputPath)
        return
    templatePath = os.path.normpath(basePath + relativePathTemplate)
    if not os.path.exists(templatePath):
        print('ERROR: templatePath does not exist: ' + templatePath)
        return
    templates.clear()
    finishedFiles.clear()
    backupedFiles.clear()
    processFolder(inputPath, outputPath, templatePath)
    print('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
    i = 0
    while processFolder(outputPath, outputPath, templatePath):
        print('loop ' + str(i) + ' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        i = i + 1
        if i >= maxLoops:
            break 
    print('loop ' + str(i) + ' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

#print (sys.version_info)
print('')
print('############################################################')
main( os.path.dirname(os.path.abspath(__file__)) )
print('############################################################')

#templates4File = dict()#{'x':[]}


