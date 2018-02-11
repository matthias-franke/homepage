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

folderName = 'primeKey'
message = "OK"

print "Content-type:text/html"
print 'Access-Control-Allow-Methods: POST, GET, OPTIONS'
print "Access-Control-Allow-Origin: *\r\n"
print ''

class AddressException(Exception): pass
    
def getKey(address):
    pathName = os.path.join(folderName, address)
    pathFileNamePem = os.path.join(pathName, 'k.pem')  
    if not os.path.isfile(pathFileNamePem):
        raise AddressException( 'Address unknown!' ) 

    with lockLib.FileLock(address) as lock:
        with open(pathFileNamePem, "r") as publicfileR:
             return publicfileR.read()

try:

    arguments = cgi.FieldStorage()
        
    if arguments.has_key('a'):

        address = arguments['a'].value
        message = getKey(address)
        
    else:
        message = 'missing address'        
    
except AddressException, e:    
    message = 'address exception: ' + e.message
except lockLib.LockException, e:    
    message = 'lock exception: ' + e.message    
except Exception, e:    
    message = 'unknown exception: ' + e.message 
except:   
    message = 'Fatal unknown Error'

print message
    
