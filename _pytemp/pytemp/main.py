#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os, shutil, xml.etree.ElementTree
import filecmp
import itertools as IT
import io
# --> lxml
import lxml.etree
# <-- lxml

from datetime import datetime
from os.path import isfile
#from sets import Set

# list1 = ['physics', 'chemistry', 1997, 2000];
# tup1 = ('physics', 'chemistry', 1997, 2000);
# dict = {'Name': 'Zara', 'Age': 7, 'Class': 'First'}

text_command = '/' # /text()

relativePathInput = '\\..\\..\\franke-matthias.de_input'
templateFiles = ['_0temp.txt']
extentionsInput = ['.htm', '.html', '.xml']

relativePathOutput = '\\..\\..\\franke-matthias.de'
pathExtBkp = 'bkp'



insertTmp_TagMarker = '#'
insertXPathTmp_TagStart = '<!--' + insertTmp_TagMarker
insertXPathTmp_DelimiterFileXPath = ' '
insertXPathTmp_TagEnd= '-->'

maxCopyAttempts = 99
maxLoops = 9

templates = dict() #{}
templatesPerFile = dict()

#finishedFiles = set()
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
                    tag = line[tagAfterStart:tagEnd]#.strip()
                    tagAfterEnd = tagEnd + 3
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
                                        cursor = cursor #+ 1
                                        break
                    tagStart = line.find('<!--', tagAfterEnd)
                else:
                    tagStart = -1
            for key in tempTemplates.keys():
                tempTemplates[key] += line[cursor:] #+ '\n'
        for key in tempTemplates.keys():
            print('WARNING ' + key + ' missing closing tag' )
        del tempTemplates

def readTemplates(path):
    templates.clear()
    for unqualifiedFile in templateFiles:
        file = os.path.join(path, unqualifiedFile)
        if os.path.isfile(file):
            readTemplate(file)
        else:
            print('Error: ' + file + ' is no file')

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
        return fileCpy
    return f

def writeFile(path, unqualifiedFile, listOfSections):
    f = os.path.join(path, unqualifiedFile)
    qualPathBkp = os.path.join(path, pathExtBkp)
    if backupFile(path, unqualifiedFile) is True:
        with open(f, 'w') as file:
            for section in listOfSections:
                file.write(section)
    return f

def getTemplate(tag, actualFile):
    #print(' |-->' + fileAndXpath)
    if tag in templates:
        #print(' return form dict |-->' + templates[fileAndXpath])
        return templates[tag]
    else:
        xpath = None;
        source = None;
        if tag.find(insertXPathTmp_DelimiterFileXPath) > -1:
            file, xpath = tag.split(insertXPathTmp_DelimiterFileXPath)
            source = os.path.dirname(actualFile.name) + '\\' + file
        else:
            #if actualFile.name.endswith('.xml'):
            xpath = tag
            source = actualFile.name
            #else:
            #    return insertXPathTmp_TagStart + tag + insertXPathTmp_TagEnd
        if source in templatesPerFile:
            if tag in templatesPerFile[source]:
                return templatesPerFile[source][tag]
        else:
            templatesPerFile[source] = {}
        reBin = None
        try:
            root = xml.etree.ElementTree.parse(source)
            if xpath.endswith(text_command):
                reBin = root.find(xpath[:-len(text_command)])
            else:
                reBin = root.find(xpath)
            # --> lxml geht einfach nicht
            """
            #root = lxml.etree.XML(io.StringIO(source))
            root = lxml.etree.parse(source)
            reBin = root.xpath(xpath)
            """
            # <-- lxml
        except xml.etree.ElementTree.ParseError as err:
            print('ERROR ParseError: ' + str(err) + ' in ' + str(source))
        #except FileNotFoundError as err:
        #    print('ERROR File not found: ' + str(err) + ' in ' + str(source))
        if reBin is not None:
            # --> lxml geht nich
            """
            re = None
            if type(reBin) is list:
                if len(reBin) > 0:
                    reBin = reBin[0]
                else:
                    reBin = None
            if reBin is not None:
                if type(reBin) is lxml.etree._Element:
                    re = lxml.etree.tostring(reBin)
                else:
                    if reBin.is_text:
                        re = reBin                
            """
            # <-- lxml
            if xpath.endswith(text_command):
                #re = xml.etree.ElementTree.tostring(reBin).decode()
                re = reBin.text 
                if re is None:
                    re = ''                
                #print(' return ' + str(source) + ' test>' + re)
            else:
                re = xml.etree.ElementTree.tostring(reBin)#.decode() 
                if re is None:
                    re = ''
                #print(' return ' + str(source) + ' ele>' + str(re))                
            if re is None:
                re = ''
           
            #templatesPerFile[source][tag] = re
            
            return re
        else:
            print('Info: no xpath ' + xpath + ' in ' + str(source))

    return None

def processFile(f):
    listOfSections = ['']
    with open(f, 'r') as file:
        i = 0
        for line in file:
            cursor = 0
            tagStart = line.find(insertXPathTmp_TagStart, cursor)        
            while tagStart > -1:
                listOfSections[i] += line[cursor:tagStart]
                cursor = tagStart + len(insertXPathTmp_TagStart)
                tagEnd = line.find(insertXPathTmp_TagEnd, cursor)
                if tagEnd > -1:
                    tag = line[cursor:tagEnd]
                    tmp = getTemplate(tag.strip(), file)
                    cursor = tagEnd + len(insertXPathTmp_TagEnd)
                    if tmp is not None:
                        listOfSections.append(tmp)
                        i = i + 1
                    else:
                        print('Info: no template ' + tag + ' found for ' + f )
                        listOfSections[i] += insertXPathTmp_TagStart + tag + insertXPathTmp_TagEnd
                    tagStart = line.find(insertXPathTmp_TagStart, cursor)
                else:
                    cursor = tagStart
                    break
            listOfSections[i] += line[cursor:]   
    return listOfSections
    
def processFile_old(f):
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
                    tmp = getTemplate(lineEnd[:tagEnd].strip(), file)
                    if tmp is not None:
                        listOfSections[i] += line[:tagStart]
                        listOfSections.append(tmp)
                        listOfSections.append(lineEnd[tagEnd + len(insertXPathTmp_TagEnd):])
                        i = i + 2
                    else:
                        print('Info: no template ' + lineEnd[:tagEnd] + ' found for ' + f )
                        listOfSections[i] += line
                else:
                    listOfSections[i] += line
            else:
                listOfSections[i] += line
    return listOfSections

def cpyFolder(inputPath, outputPath):
    for unqualifiedFile in sorted(os.listdir(inputPath)):
        file = os.path.join(inputPath, unqualifiedFile)
        if os.path.isfile(file):
            i = 0
            for ext in extentionsInput:
                if file.endswith(ext):
                    fileCpy = cpyFile(file, outputPath, unqualifiedFile)
                    break
        else:
            #print('folder: ' + file)
            if unqualifiedFile != pathExtBkp:
                outputPathChild = os.path.join(outputPath, unqualifiedFile)
                if not os.path.exists(outputPathChild):
                    os.makedirs(outputPathChild)
                if not os.path.exists(outputPathChild):
                    print('ERROR: outputPath does not exist: ' + outputPathChild)
                else:
                    cpyFolder(file, outputPathChild)
    
def processFolder(inputPath):
    """
    for tag in templates:
        print(' . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .')
        print(tag)
    """
    for unqualifiedFile in sorted(os.listdir(inputPath)):
        file = os.path.join(inputPath, unqualifiedFile)
        if os.path.isfile(file):
            i = 0
            for ext in extentionsInput:
                if file.endswith(ext):
                    while i <= maxLoops:
                        result = processFile(file)
                        if len(result) <= 1:
                            break
                        print('~ ' + file + ' loop' + str(i))
                        file = writeFile(inputPath, unqualifiedFile, result)
                        if file in templatesPerFile:
                            templatesPerFile[file].clear()
                        i = i + 1
                    if i == 0:
                        if file in templatesPerFile:
                            templatesPerFile[fileCpy] = templatesPerFile[file]
                    break
        else:
            #print('folder: ' + file)
            if unqualifiedFile != pathExtBkp:
                processFolder(file)

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
    readTemplates(inputPath)
    backupedFiles.clear()
    cpyFolder(inputPath, outputPath)
    processFolder(outputPath)

#print (sys.version_info)
print('')
print('############################################################')
main( os.path.dirname(os.path.abspath(__file__)) )
print('############################################################')

"""
try:
    root = xml.etree.ElementTree.parse('C:\\_\\03_WWW_Projects\\_GitHub\\homepage\\franke-matthias.de\\_toc.xml')
    reBin = root.find('textJournalBerichtSub')
except xml.etree.ElementTree.ParseError as err:
    print('ERROR ParseError: ' + str(err) + ' in ' + str(source))
if reBin is not None:
    re = xml.etree.ElementTree.tostring(reBin).decode()
    print(re)
"""

#templates4File = dict()#{'x':[]}
