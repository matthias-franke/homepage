#!/usr/bin/env python
#!"X:\System\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"
#!"C:\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"
# -*- coding: utf-8 -*-
"""
Created on Fri Feb 07 21:52:02 2014

@author: cimcim
"""

import primeUploadPubKey, os, lockLib#, #, lockLib
import cgitb
cgitb.enable()

print "Content-type:text/html"
print 'Access-Control-Allow-Methods: POST, GET, OPTIONS'
print "Access-Control-Allow-Origin: *\r\n"
print ''

print(primeUploadPubKey.folderName + ':')
if not os.path.exists(primeUploadPubKey.folderName):
    try:
        os.makedirs(primeUploadPubKey.folderName)
        print('ok')
    except OSError:
        print('Sorry')  
else:
    print('nothing todo')

print('<br>' + lockLib.folderName + ':') 
if not os.path.exists(lockLib.folderName):
    try:
        os.makedirs(lockLib.folderName)
        print('ok')
    except OSError:
        print('Sorry')  
else:
    print('nothing todo')    