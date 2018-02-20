#!/usr/bin/env python
#!"X:\System\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"
#!"C:\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"
# -*- coding: utf-8 -*-
"""
Created on Fri Feb 07 16:46:23 2014

@author: cb3fias
"""

import cgi, lockLib, os
import cgitb
cgitb.enable()

folderName = 'prime'
message = "OK"

print "Content-type:text/html"
print 'Access-Control-Allow-Methods: POST, GET, OPTIONS'
print "Access-Control-Allow-Origin: *\r\n"
print ''

class AddressException(Exception): pass
    
def getMsg(msgTo):
    pathName = os.path.join(folderName, msgTo)
    if os.path.exists(pathName):
        re = ''
        for afile in os.listdir(pathName):
            if not afile.endswith(".pem"):
                with open( os.path.join(pathName, afile), "r") as afileR:
                    re = re + afile + '|'
                    re = re + afileR.read() + '|'
        return re
    else:
        return 'do not know ' + msgTo     

try:

    arguments = cgi.FieldStorage()
    if arguments.has_key('a'):
        message = getMsg(arguments['a'].value)
        
    else:
        message = 'missing address'        
        
    
except AddressException, e:    
    message = 'address exception: ' + e.message
except lockLib.LockException, e:    
    message = 'lock exception: ' + e.message    
except Exception, e:    
    message = message + ' unknown exception X: ' + e.message 
except:   
    message = 'Fatal unknown Error'

print message
    
