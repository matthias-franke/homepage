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
    
def storeMsg(msgTo, msgFrom, msg):
    pathName = os.path.join(folderName, msgTo)
    if os.path.exists(pathName):
	files = sorted( [int(f) for f in os.listdir(pathName)] )
	if len(files) > 0:
            pathFileNameMsg = os.path.join(pathName, str( files[-1] + 1) )
	else:
	    pathFileNameMsg = os.path.join(pathName, '0') 
        #if os.path.isfile(pathFileNameMsg):
            # TODO APPEND / BLOCK
            #raise AddressException( 'Msg exists!' ) 
    else:
        return 'do not know ' + msgTo     

    with open(pathFileNameMsg, "w") as file:
        file.write( msgFrom )
        file.write( '|' )
        file.write( msg )
    
    return 'OK Message stored!'

try:

    arguments = cgi.FieldStorage()
    if arguments.has_key('f'):
        msgFrom = arguments['f'].value
        
        if arguments.has_key('t'):
            msgTo = arguments['t'].value
            
            if arguments.has_key('m'):
                message = storeMsg(msgTo, msgFrom, arguments['m'].value)
                
            else:
                message = 'missing message'             
            
        else:
            message = 'missing to-address'        
        
    else:
        message = 'missing from-address'
    
except AddressException, e:    
    message = 'address exception: ' + e.message
except lockLib.LockException, e:    
    message = 'lock exception: ' + e.message    
except Exception, e:    
    message = 'unknown exception: ' + e.message 
except:   
    message = 'Fatal unknown Error'

print message
    
