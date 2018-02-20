#!"C:\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"
#!/usr/bin/env python
#!"X:\System\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"
# -*- coding: utf-8 -*-
"""
Created on Fri Feb 07 16:46:23 2014

@author: cb3fias
"""

import cgi, lockLib, os, base64, boomCryptPemLib, boomDecryptLib
import cgitb
cgitb.enable()

folderName = 'primeKey'
message = "0|?"

print "Content-type:text/html"
print 'Access-Control-Allow-Methods: POST, GET, OPTIONS'
print "Access-Control-Allow-Origin: *\r\n"
print ''

class AddressException(Exception): pass
    
def storeKey(address, key, signature, signedMsg):
    pathName = os.path.join(folderName, address)
    pathFileNamePem = os.path.join(pathName, 'k.pem')
    global message
    with lockLib.FileLock(address) as lock:
        if os.path.exists(pathName):
            if os.path.isfile(pathFileNamePem):
                # TODO Auf Nachrichten pruefen! erst abholen! ...
                # TODO Nachrichten STOP ...
                with open(pathFileNamePem, 'r') as publicfileR:
                    oldKeyFileData = publicfileR.read()
                    if oldKeyFileData == key:
                       message = "1|" + pathName + "|old Key equals new Key"
                       #return
                    oldKeyFileData = oldKeyFileData.replace("_", "+");
                    oldKeyData = base64.decodestring(oldKeyFileData)
                    oldKey = boomCryptPemLib.PublicKey.load_pkcs1_openssl_der(oldKeyData)  
                    clear = boomDecryptLib.verify2(signature, oldKey) 
                    if clear != signedMsg:
                        raise AddressException( 'signature not validated. clear[' + clear + '] != signedMsg[' + signedMsg + ']' )            
                message = "1|" + pathFileNamePem + "|exchangedFile"
            else:
                message = "1|" + pathFileNamePem + "|newFile"
        else:
            os.makedirs(pathName)
            message = "1|" + pathFileNamePem + "|newPath"            
        with open(pathFileNamePem, "w") as file:
            file.write( key )
            message = message + " written"   

try:

    arguments = cgi.FieldStorage()
    if arguments.has_key('k'):
        key = arguments['k'].value
        if arguments.has_key('a'):
            address = arguments['a'].value
            if arguments.has_key('s'):
                signature = arguments['s'].value
                if arguments.has_key('m'):
                    signedMsg = arguments['m'].value
                    storeKey(address, key, signature, signedMsg)
                else:
                    message = '0|missing message'
            else:
                message = '0|missing signature' 
        else:
            message = '0|missing address'        
    else:
        message = '0|missing key'

except AddressException, e:    
    message = '0|address exception: ' + e.message
except lockLib.LockException, e:    
    message = '0|lock exception: ' + e.message 
except OSError, e:    
    message = '0|OSError: ' + e.message     
except Exception, e:    
    message = '0|unknown exception: ' + e.message 
except:   
    message = '0|Fatal unknown Error'

print message
    
