    	/** (c) 2014 Matthias Franke **/
      /** GLOBAL CONSTS **/
      var STR_NO_KEY = "-- NO KEY LOADED --";

      var STATE_KEY_INITIAL  = 0;
      var STATE_KEY_CREATE   = 1;
      var STATE_KEY_CREATED  = 2;
      var STATE_KEY_CANCEL   = 3;
      var STATE_KEY_UPLOAD   = 4;
      var STATE_KEY_UPLOADED = 5;

      /** GLOBAL VARS **/          
      var host = "http://localhost/cgi-bin/"; /* "http://conetex.com/cgi-bin/";  */
      var myPrimeID = null;     
      var state_key = STATE_KEY_INITIAL;
      
      var newPrivateKey = null;
      
      var contactAlphaSelected = null;
      var contactManuelSelected = null;
      var contactManuelDragged = null;

      var currentThread = null;
      //var currentThreadKeyDiv = null;
      //var currentThreadIdDiv = null;

      var msgSelectedDiv = null;
      var msgReceivedLast = -1;

      var running = false;

   
      
      //var uiStateReceiveOpen = false;
      //var uiStateReceiveCreate = false;
      //var opendPrivateKey = null;
      //var opendPubKey = null;
      /** Get Public Keys **/
      
      // Return the PKCS#1 RSA decryption of "ctext".
      // "ctext" is an even-length hex string and the output is a plain string.
      function RSAVerify(ctext) {
        var x = parseBigInt(ctext, 16);
        var m = x.modPowInt(this.e, this.n);
        if(m == null) return null;
        return pkcs1unpad2(m, (this.n.bitLength()+7)>>3);
      }
      RSAKey.prototype.verify = RSAVerify;
      
      // Return the PKCS#1 RSA encryption of "text" as an even-length hex string
      function RSASign(text) {
        var m = pkcs1pad2(text,(this.n.bitLength()+7)>>3);
        if(m == null) return null;
        var c = m.modPow(this.d, this.n);
        if(c == null) return null;
        var h = c.toString(16);
        if((h.length & 1) == 0) return h; else return "0" + h;
      }
      RSAKey.prototype.sign = RSASign;


      function getCurrentIdStr(){
        if(currentThread){
          var idStr = currentThread.id;
          return idStr.substring(1, idStr.length);
        }
        return null;
      }      
      function getKeyStoringElement(idStr){
        if(idStr){
          return document.getElementById( 'z' + idStr );
        }
        return null;
      }  
      function isKeyLoaded(el){ 
        if(!el){
					return false;
        }
        if(!el.firstChild.data){
		      return false;
    		}      
        if(el.firstChild.data === STR_NO_KEY){
		      return false;
    		}
				return true;        		        		  	
      }          
      function downloadKeyCurrentIfNull(){
    		var idStr = getCurrentIdStr();
        var el = getKeyStoringElement( idStr );
        if(!el){
          outInfo("Fatal Error - downloadKeyCurrent: There is target-tag");
          return;
        }
  			if(! isKeyLoaded(el) ){ // TODO downloadKey(idStr, el.firstChild) mit Callback ...
          downloadKey(idStr, el.firstChild);
        }
        // TODO else: encrypt-Button aktivieren ...
      }    
      function downloadKeyCurrent(){
    		var idStr = getCurrentIdStr();
        var el = getKeyStoringElement( idStr );
        if(!el){
          outInfo("Fatal Error - downloadKeyCurrent: There is target-tag");
          return;
        }
        downloadKey(idStr, el.firstChild);
      }      
        
      function downloadKeyNew(){                                    //newcontactID
        var contactID = document.getElementById('newcontactID').value;
        var keyTarget = document.getElementById( 'newKey' );
        downloadKey(contactID, keyTarget.firstChild);
      }
      
      function downloadKey(contactID, keyTarget){
        if (contactID && contactID!=''){
          var req = getReq();
          if (req){
            req.onreadystatechange = function () {
              if(req.readyState==4 && req.status==200){
                outInfo("download Key finished! Result: " + req.responseText);
                var key = req.responseText.replace(/_/g, "+");
                keyTarget.data = key;
                outLock(null);
              }
            }
            if( outLock("downloading Key ...") ){
              req.open("GET", 'http://conetex.com/cgi-bin/primeDownloadPubKey.py?a='+contactID+'&x='+Math.random(), false);
              req.send(null);
            }
            else{
              outInfo("Fatal Error - downloadKey: There is still a running Process...");
            }
          }
          else{
            outInfo("Fatal Error - downloadKey: Your browser does not support XMLHTTP.");
          }
        }
        else{
           outInfo("Error - downloadKey: No Sender-Address! Please setup your Prime-ID!");
        }
      }      
      function downloadKey2Finished(keyTarget, req) {
        if(req.readyState==4 && req.status==200){
          outInfo("download Key finished! Result: " + req.responseText);
          var key = req.responseText.replace(/_/g, "+");
          keyTarget.data = key;
          outLock(null);
        }
      }
      function downloadKey2(contactID, keyTarget, callbackFunction){
        if (contactID && contactID!=''){
          var req = getReq();
          if (req){
            req.onreadystatechange = callbackFunction(keyTarget, req);
            req.open("GET", 'http://conetex.com/cgi-bin/primeDownloadPubKey.py?a='+contactID+'&x='+Math.random(), false);
            if( outLock("downloading Key ...") ){
              req.send(null);
            }
            else{
              outInfo("Fatal Error - downloadKey: There is still a running Process...");
            }
          }
          else{
            outInfo("Fatal Error - downloadKey: Your browser does not support XMLHTTP.");
          }
        }
        else{
           outInfo("Error - downloadKey: No Sender-Address! Please setup your Prime-ID!");
        }
      }      
      /** Encrypt and Send Message **/
      function encryptAndSendMsg() {
        if(!currentThread){
          outInfo("Error - encryptMsg: No Addressee!");
          return;
        }
        var toAddress = currentThread.id.substring(1, currentThread.id.length);
        var keyElement = document.getElementById("z" + toAddress);

        if(!keyElement.firstChild || !keyElement.firstChild.data){
          outInfo("Error - encryptMsg: no pub-Key for Addressee!");
          return;
        }
        var pubKeyText = keyElement.firstChild.data;
        var opendPubKey = new RSAKey();
        if(! opendPubKey.parseKey(pubKeyText)){
          outInfo("Error - encryptMsg: can not parse Addressees public Key!");
          return;
        }
        var messageToSend = null;
        messageToSend = removeWhiteSpace( document.getElementById('msg').value );
        if(! messageToSend){
          outInfo("Error - encryptMsg: No Message to send!");
        }
        else{
          if( outLock("encrypting ...") ){ // TODO wie lang darf die nachricht sein???
            var messageToSendEncrypted = null;
            messageToSendEncrypted = opendPubKey.encrypt(messageToSend);
            outLock(null);
            document.getElementById('msg').value = messageToSendEncrypted;
            // TODO lieber loggen
            
            sendMsg(messageToSendEncrypted, messageToSend);
            
          }
          else{
            outInfo("Fatal Error - encryptMsg: There is still a running Process...");
          }
        }
        document.getElementById("msg").focus();
      	window.scrollTo(0, document.body.scrollHeight);        
      }
      /** Send Message **/
      function sendMsg(MessageToSendEncrypted, messageToSend){
        if(!currentThread){
          outInfo("Error - sendMsg: No Addressee!");
          return;
        }
        var toAddress = currentThread.id.substring(1, currentThread.id.length);
        var fromAddress = document.getElementById('Address').value;
        if (MessageToSendEncrypted){
          if (fromAddress && fromAddress!=''){
            if (toAddress && toAddress!=''){
              var req = getReq();
              if (req){
                req.open("GET", 'http://conetex.com/cgi-bin/primeUploadMsg.py?f=' + fromAddress + '&t=' + toAddress + '&m=' + MessageToSendEncrypted + '&x=' + Math.random(), true);
                MessageToSendEncrypted = null;
                req.onreadystatechange = function () {
                  if(req.readyState==4  && req.status==200){
                    if(messageToSend){
                      createMsgTag(currentThread.lastChild, messageToSend, "messageMy");        // MSG
                      document.getElementById('menuCurrentItemDeleteAll').className = "i il ena";
                    }
                    document.getElementById('msg').value = "";
                    messageToSend = null;
                    outLock(null);
                    outInfo("upload finished! output: " + req.responseText);
                  }
                }
                if( outLock("uploading encrypted Message ...") ){
                  req.send(null);
                }
                else{
                  outInfo("Fatal Error - sendMsg: There is still a running Process...");
                }
              }
              else{
                outInfo("Error - sendMsg: Your browser does not support XMLHTTP.");
              }
            }
            else{
              outInfo("Error - sendMsg: No Addressee!");
            }
          }
          else{
            outInfo("Error - sendMsg: No Sender-Address! Please setup your Prime-ID!");
          }
        }
        else{
          outInfo("Error - sendMsg: No Message to send");
        }
      }

      /** Create Private Key **/
      function resetCreateKey(){
      
          setStateKeyUPLOADED();
	        var oldPriKeyText = document.getElementById('key').value;
	        if(oldPriKeyText){
		        var oldPriKey = new RSAKey();
		        if( oldPriKey.parseKey(oldPriKeyText) ){
		        	document.getElementById('priKeyPre').firstChild.data = oldPriKeyText;
			        document.getElementById('publicKey').firstChild.data = oldPriKey.getPublicKey();         
		        }
		        else{
		        	document.getElementById('priKeyPre').firstChild.data = STR_NO_KEY
		        	document.getElementById('key').value = STR_NO_KEY;
		          outInfo("Error - createPrivateKeyFinished: can not parse old private Key!");	        	
		        }
					}
      
      }
      function createCancelUpload(){
        // CREATE
      	if(state_key === STATE_KEY_INITIAL || state_key === STATE_KEY_UPLOADED){
          setStateKeyCREATE();
      		createPrivateKey();
      		return;
      	}
      	
      	// CANCEL CREATION
      	if(state_key === STATE_KEY_CREATE){
          setStateKeyCANCEL();
	        var oldPriKeyText = document.getElementById('key').value;
	        if(oldPriKeyText){
		        var oldPriKey = new RSAKey();
		        if( oldPriKey.parseKey(oldPriKeyText) ){
		        	document.getElementById('priKeyPre').firstChild.data = oldPriKeyText;
			        document.getElementById('publicKey').firstChild.data = oldPriKey.getPublicKey();         
		        }
		        else{
		        	document.getElementById('priKeyPre').firstChild.data = STR_NO_KEY
		        	document.getElementById('key').value = STR_NO_KEY;
		          outInfo("Error - createPrivateKeyFinished: can not parse old private Key!");	        	
		        }
					}
					return;
			  }
      	
      	// UPLOAD
      	if(state_key === STATE_KEY_CREATED){
	      	if( uploadPubKey() ){
            setStateKeyUPLOAD();
	      		setTimeout(           
                function(){
                  if(state_key === STATE_KEY_UPLOAD){
  	      		  	  outInfo("upload timeout!");
                    setStateKeyCREATED();
                  }  	      		  	
	      			  }
              , 120000
	      		);  		
	      	}
	      	else{
            setStateKeyCREATED();
	      	}
	      	return;			          
      	}
      }             

      function setStateKeyINITIAL(){
				state_key = STATE_KEY_INITIAL;
  		  document.getElementsByTagName('body')[0].className = 'ready';	
        document.getElementById('512').disabled = false;
        document.getElementById('1024').disabled = false;
        document.getElementById('2048').disabled = false;
        //document.getElementById('4096').disabled = true;           
	      document.getElementById('buttonCreateCancelUpload').firstChild.data = 'Create retry';       
      }
      function setStateKeyCREATE(){
    		state_key = STATE_KEY_CREATE;
        // TODO warteanzeigen ein
        document.getElementsByTagName('body')[0].className = 'working';      
        document.getElementById('512').disabled = true;
        document.getElementById('1024').disabled = true;
        document.getElementById('2048').disabled = true;
        //document.getElementById('4096').disabled = true;      
	      document.getElementById('buttonCreateCancelUpload').firstChild.data = 'Cancel';					        
      }      
      function setStateKeyCREATED(){
        state_key = STATE_KEY_CREATED;
  		  document.getElementsByTagName('body')[0].className = 'ready';	
  		  document.getElementById('buttonCreateCancelUpload').firstChild.data = 'retry Upload';
      }
      function setStateKeyUPLOAD(){
  		  // TODO warteanzeigen ein
        state_key = STATE_KEY_UPLOAD;
        document.getElementsByTagName('body')[0].className = 'working';
    		document.getElementById('buttonCreateCancelUpload').firstChild.data = 'please wait ... we load up';	
      }      
      function setStateKeyUPLOADED(){
        state_key = STATE_KEY_UPLOADED;  
  		  document.getElementsByTagName('body')[0].className = 'ready';	
        document.getElementById('512').disabled = false;
        document.getElementById('1024').disabled = false;
        document.getElementById('2048').disabled = false;
        //document.getElementById('4096').disabled = false;                  
        document.getElementById('buttonCreateCancelUpload').firstChild.data = 'Create'; 
      }
      function setStateKeyCANCEL(){
				state_key = STATE_KEY_CANCEL;  
	      document.getElementById('buttonCreateCancelUpload').firstChild.data = 'please wait ... we cancel';        
      }      
            
      function createPrivateKey() {
        //document.getElementById('Address').value = "";//TODO was soll das?
        newPrivateKey = new RSAKey();
        var bits = 512;
        if (document.getElementById('1024').checked) {
          bits = 1024;
        }
        else if (document.getElementById('2048').checked) {
          bits = 2048;
        }
        /*else if (document.getElementById('4096').checked) {
          bits = 4096;
        }*/
        //if( outLock("generating Key ...") ){
          newPrivateKey.generateAsync(bits, '010001', createPrivateKeyFinished); //65537 default openssl public exponent for rsa key type
        //}
        //else{
        //  outInfo("Fatal Error - createPrivateKey: There is still a running Process...");
        //}     
      }
      function createPrivateKeyFinished(){
        if(state_key === STATE_KEY_CREATE){
          // TODO warteanzeigen aus
          document.getElementsByTagName('body')[0].className = 'ready';
          outLock(null);
          if(newPrivateKey && newPrivateKey.d && newPrivateKey.n){
  	        document.getElementById('priKeyPre').firstChild.data = newPrivateKey.getPrivateKey();
  	        document.getElementById('publicKey').firstChild.data = newPrivateKey.getPublicKey();
  	        state_key = STATE_KEY_CREATED;
            createCancelUpload();
  	        //document.getElementById('buttonCreateCancelUpload').firstChild.data = 'Upload';  
        	}
        	else{
            setStateKeyINITIAL();
        	}
        }
      }


      function uploadPubKey(){
      	
        var fromAddress = document.getElementById('Address').value;
        if (! fromAddress){
          outInfo("Error - uploadPubKey: No Address! Please setup your Prime-ID!");
          return false;
        }

        var sigMsg = ( Math.random() ).toString();
        var signature = '-';
        var oldPriKeyText = document.getElementById('key').value;
        if(oldPriKeyText){
	        var oldPriKey = new RSAKey();
	        if( oldPriKey.parseKey(oldPriKeyText) ){
	          signature = oldPriKey.sign(sigMsg);
	        }
	        else{
	          outInfo("Error - createPrivateKeyFinished: can not parse old private Key!");	        	
	        }
	        /* // just for debug:
	        var oldPubKey = new RSAKey();
	        if( oldPubKey.parseKey(oldPriKey.getPublicKey()) ) {
		        var nStr = oldPubKey.n.toString();
		        var reSig = oldPubKey.verify(signature);
	        }
	        */	        
      	}

        var publicKeyStr = newPrivateKey.getPublicKey();
        if (! publicKeyStr){
          outInfo("Error - uploadPubKey: No public Key to upload!");
          return false;
        }
        publicKeyStr = publicKeyStr.replace(/\+/gi,"_");
        publicKeyStr = publicKeyStr.replace(/-----BEGIN PUBLIC KEY-----/gi,"");
        publicKeyStr = publicKeyStr.replace(/-----END PUBLIC KEY-----/gi,"");

        var req = getReq();
        if (! req){
          outInfo("Error - uploadPubKey: Your browser does not support XMLHTTP.");
          return false;
        }
                
        var localNewPrivateKey = newPrivateKey;
        
        var qryStr = host + 'primeUploadPubKey.py?a=' + fromAddress + '&k=' + publicKeyStr + '&s=' + signature + '&m=' + sigMsg;
        req.open("GET", qryStr, true);
        req.onreadystatechange = function () {
        	if(req.readyState === 4){
		        if(req.status === 200){
		          outLock(null);
		          // TODO warteanzeigen aus
              document.getElementsByTagName('body')[0].className = 'ready';
		          var msgChunks = req.responseText.split("|");
		          if(0 < msgChunks.length){
		          	if(msgChunks[0] == "1"){// TODO warum funktioniert hier === nicht?
					        document.getElementById('key').value = localNewPrivateKey.getPrivateKey();
					        document.getElementById('priKeyPre').firstChild.data = document.getElementById('key').value;
			  		      document.getElementById('publicKey').firstChild.data = localNewPrivateKey.getPublicKey();
                  if(1 < msgChunks.length){
		          			outInfo("upload success! output: " + msgChunks[1]);
		          		}
		          		else{
		          			outInfo("upload success: " + req.responseText);
		          		}
                  setStateKeyUPLOADED();          		
		          	}
		          	else{
		          		if(1 < msgChunks.length){
		          			outInfo("upload error! output: " + msgChunks[1]);
		          		}            		
		          		else{
		          			outInfo("upload error: "  + req.responseText);
		          		}
                  newPrivateKey = localNewPrivateKey;
					        setStateKeyCREATED();            		
		          	}
		          }
		      		else{
		      			outInfo("upload unexpected error: " + req.responseText);
                newPrivateKey = localNewPrivateKey;
				        setStateKeyCREATED();            		        			
		      		}           
		        }
		        else{
	      			outInfo("upload unexpected communication error: status " + req.status.toString() + " - " + req.responseText);
			        newPrivateKey = localNewPrivateKey;
              setStateKeyCREATED();		        	
		        }        		
        	}
        }
        if( outLock("uploading public Key ...") ){
          req.send(null);
          newPrivateKey = null;
        }
        else{        	
          outInfo("Fatal Error - uploadPubKey: There is still a running Process...");
          return false;
        }
        return true;
      }      

      
      
      function savePrivateKey() {
        if(newPrivateKey){
          var prkPrinted = newPrivateKey.getPrivateKey();
          var name = removeWhiteSpace(document.getElementById('Address').value);
          if(name==''){
            name = 'privateKey';
          }
          name = name + ".pem";
          saveAs(getKeyBlob(prkPrinted), name);
          newPrivateKey=null;
        }
        else{
          outInfo("Error - savePrivateKey: no new Key in place ...");
        }
      }
      /** Manage Private Key **/
      function getKeyBlob(keyStr) {
        return new Blob([ keyStr ], {type: "text/plain;charset=utf-8"});
      }

      function readFileSelect(aFile) {
        var aFileName = escape(aFile.name);
        if(aFile.size > 4550){
          outInfo("Error - readFileSelect: The File is to big! Is it a Key-File?");
        }
        else if( !(aFileName.endsWith('.pem')) && !(aFileName.endsWith('.txt')) ){
          outInfo("Error - readFileSelect: Sorry! We expect am pem-File!");
        }
        else{
          //document.getElementById('key').value = "";
          //document.getElementById('publicKey').firstChild.data = " ";
          //document.getElementById('priKeyPre').firstChild.data = " ";
          var reader = new FileReader();
          reader.onload = (function(theFile) {
            return function(e) {
              var opendPrivateKey = new RSAKey();
              if(opendPrivateKey.parseKey(e.target.result)){
                if(! opendPrivateKey.encrypt){
                  outInfo("Error - readFileSelect: opendPrivateKey.encrypt is not available!");
                }
                if(! opendPrivateKey.decrypt){
                  outInfo("Error - readFileSelect: opendPrivateKey.decrypt is not available!");
                }
                if(! opendPrivateKey.generateAsync){
                  // TODO Fehlerbehandlung
                  outInfo("Error - readFileSelect: opendPrivateKey.generateAsync is not available!");
                }
                setStateKeyCREATED();
                var prkPrinted = opendPrivateKey.getPrivateKey();
                document.getElementById('key').value = prkPrinted;
                document.getElementById('priKeyPre').firstChild.data = document.getElementById('key').value;
                var pubPrinted = opendPrivateKey.getPublicKey(); // TODO: nur bei Setup mode wird publicKey gebraucht
                document.getElementById('publicKey').firstChild.data = pubPrinted;                
              }
              else{
                // TODO: Sorry can not parse this key!
                outInfo("Error - readFileSelect: can not parse your Private-Key!");
                opendPrivateKey = null;
              }
            };
          })(aFile);
          reader.readAsText(aFile);
          document.getElementById('Address').value = aFileName.substr(0, aFileName.length-4);
          handleAddressChanged();
          //document.getElementById('keyfile').firstChild.data = aFile.name;
          //handleKeyChanged(); //TODO: Nur im Open - Mode
          //
        }
      }
      function handleFileSelect(evt) {
        readFileSelect( evt.target.files[0] );
      }
      function handleFileDrop(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        readFileSelect( evt.dataTransfer.files[0] );
      }
      function handleFileDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
      }



      /** Receive Messages **/
      function receiveMsg(){
        // TODO warteanzeigen aus
        var fromAddress = document.getElementById('Address').value;
        if (fromAddress && fromAddress!=''){
          var req = getReq();
          if (req){
            var m = document.getElementById('msg').value;
            req.open("GET", 'http://conetex.com/cgi-bin/primeDownloadMsg.py?a=' + fromAddress + '&x=' + Math.random(), true);
            req.onreadystatechange = function () {
              if(req.readyState==4 && req.status==200){
                var msgChunks = req.responseText.split("|");
                for(var i = 2; i < msgChunks.length; i = i + 3){
                  var newMsgID = parseInt( msgChunks[i-2] );                          // ID
                  var l = msgReceivedLast;//TODO Rueckbau nur fuer debug...
                  if(newMsgID > msgReceivedLast){
                    msgReceivedLast = newMsgID;
                    var contactMsgs = document.getElementById("u" + msgChunks[i-1]);  // FROM
                    if(! contactMsgs){
                      var contactKey = STR_NO_KEY;
                      saveNewContactParam(msgChunks[i-1], contactKey, msgChunks[i-1]);
                      contactMsgs = document.getElementById("u" + msgChunks[i-1]);
                    }
                    createMsgTag(contactMsgs, msgChunks[i], "messageCrypted");        // MSG
                  }
                }
              }
            }
            req.send(null);
          }
          else{
            outInfo("Error - receiveMsg: Your browser does not support XMLHTTP.");
          }
        }
        else{
           outInfo("Error - receiveMsg: No Sender-Address! Please setup your Prime-ID!");
        }
      }
      function createMsgTag(contactMsgsNode, msg, classN){
        var msgDiv = document.createElement('div');
        msgDiv.className = classN;
        msgDiv.appendChild( document.createTextNode(msg) );
        msgDiv.onclick = handleSelectMsg;
        contactMsgsNode.appendChild(msgDiv);
        /*
        if(contactMsgsNode.hasChildNodes()){
          contactMsgsNode.insertBefore( msgDiv, contactMsgsNode.firstChild );
        }
        else{
          contactMsgsNode.appendChild(msgDiv);
        }
        */
        window.scrollTo(0, document.body.scrollHeight);
      }


      /** Decrypt Message **/
      function decryptMsg() {
        if(msgSelectedDiv){
          if(msgSelectedDiv.className === "messageCrypted sel" || msgSelectedDiv.className === "messageCrypted"){
            var opendPrivateKey = new RSAKey();
            if( document.getElementById('key') && opendPrivateKey.parseKey( document.getElementById('key').value) ) {
              var prkPrinted = opendPrivateKey.getPrivateKey();
              var msg = msgSelectedDiv.firstChild.data;
              if(msg){
                if( outLock("decrypting ...") ){
                  var decrypted = opendPrivateKey.decrypt(msg);
                  outLock(null);
                  if(decrypted === null){
                    outInfo("Error - decryptMsg: Can not decrypt!");
                  }
                  else{
                    msgSelectedDiv.firstChild.data = decrypted;
                    msgSelectedDiv.className = "message sel";
                  }
                  document.getElementById('buttonDecrypt').style.display='none';
                }
                else{
                  outInfo("Fatal Error - decryptMsg: There is still a running Process...");
                }
              }
            }
            else{
              outInfo("Error - decryptMsg: No Key loaded! Please setup!");
            }
          }
          else{
            outInfo("Info - decryptMsg: Message is already decrypted!");
          }
        }
        else{
          outInfo("Info - decryptMsg: no Message selected!");
        }
      }
    

      /** Server-Communication **/
      function getReq(){
        var req = null;
        // Browser compatibility check
        if (window.XMLHttpRequest) {
            req = new XMLHttpRequest();
        }
        else if (window.ActiveXObject) {
            try {
              req = new ActiveXObject("Msxml2.XMLHTTP");
            }
            catch (e) {
               try {
                 req = new ActiveXObject("Microsoft.XMLHTTP");
               }
               catch (e) {
                 outInfo("Fatal Error - getReq: can not init a XMLHttpRequest!");
               }
            }
        }
        return req;
      }

      /** Persistence **/
      function clearLocalStore() {
        msgReceivedLast = -1;
        if(myPrimeID){
        	localStorage.removeItem("localStorePriKey" + myPrimeID);
        	//localStorage.removeItem("address" + myPrimeID);
          localStorage.removeItem("msgReceivedLast" + myPrimeID);
          localStorage.removeItem("stateKey" + myPrimeID);
        	localStorage.removeItem("priKey" + myPrimeID);
        	localStorage.removeItem("pubKey" + myPrimeID);
        	localStorage.removeItem("localStoreMessages" + myPrimeID);
        	localStorage.removeItem("threads" + myPrimeID);
        	localStorage.removeItem("threadsAlpha" + myPrimeID);
        	localStorage.removeItem("threadsManuel" + myPrimeID);
        	localStorage.removeItem("msgReceivedLast" + myPrimeID);
      	}
      }
      function saveThreadsPriKey() {
        savePriKey();
        saveThreads();
      }
      function savePriKey(){
        if (document.getElementById('localStorePriKey')) {
        	if(myPrimeID){
	        	localStorage.setItem("myPrimeID", myPrimeID);
	        	localStorage.setItem("msgReceivedLast" + myPrimeID, msgReceivedLast.toString());
	          if (document.getElementById('localStorePriKey').checked) {
	          	localStorage.setItem("localStorePriKey" + myPrimeID, 'Y');
	            var k = document.getElementById('key');
	            if(k){
                localStorage.setItem("stateKey" + myPrimeID, state_key.toString());
	              localStorage.setItem("priKey" + myPrimeID, k.value);
	              //localStorage.address = document.getElementById('Address').value;
	              localStorage.setItem("pubKey" + myPrimeID, document.getElementById('publicKey').firstChild.data);//TODO das kann entfallen. lieber aus priKey erstellen ...
	            }
	            else{
                localStorage.setItem("stateKey" + myPrimeID, STATE_KEY_INITIAL.toString());
	              outInfo("Info - savePriKey: No Key loaded! Please setup!");
	            }
	          }
	          else{
							localStorage.setItem("localStorePriKey" + myPrimeID, 'N');          	
	          }
	          document.getElementById('Address').value = "";
        	}
        	else{
        		outInfo("Info - savePriKey: No Prime-ID to store! Please setup!");
        	}
        }
        else{
          outInfo("Info - savePriKey: local-Store is not available! Please use an up-to-date  Browser!");
        }
        document.getElementById('newContactNick').value = "";
        document.getElementById('newcontactID').value = "";
        document.getElementById('msg').value = "";
      }
      function loadPriKey(){
        if (document.getElementById('localStorePriKey')) {
        	if(! myPrimeID){
        		myPrimeID = localStorage.getItem("myPrimeID");
        	} 
        	if(myPrimeID){
        		document.getElementById('Address').value = myPrimeID;
		      	document.getElementById('menuMainItemKey').firstChild.data = myPrimeID;            
        		
        		var msgReceivedLastStr = localStorage.getItem("msgReceivedLast" + myPrimeID);
	          if(msgReceivedLastStr){
	            msgReceivedLast = parseInt( msgReceivedLastStr );
	          }
            var localStorePriKeyStr = localStorage.getItem("localStorePriKey" + myPrimeID);
            if (localStorePriKeyStr) {
	            if (localStorePriKeyStr === 'N') {
	              document.getElementById('localStorePriKey').checked = false;
	              outInfo("Info - loadPriKey: local-Store not used for private Key!");
	            }
	            else{
	              document.getElementById('localStorePriKey').checked = true;
	              var k = document.getElementById('key');
	              if(k){
	              	var priKeyStr = localStorage.getItem("priKey" + myPrimeID);
	                if(priKeyStr){
	                  k.value = priKeyStr;
	                  document.getElementById('priKeyPre').firstChild.data = priKeyStr;
	                  document.getElementById('publicKey').firstChild.data = localStorage.getItem("pubKey" + myPrimeID);//TODO das kann entfallen. lieber aus priKey erstellen ...
	                  //handleAddressChanged();
                    var state = localStorage.getItem("stateKey" + myPrimeID);
                    if(state){   
                      state_key = parseInt(state);                    
                      if( state_key == STATE_KEY_INITIAL ){ // TODO geht === ?
                        setStateKeyINITIAL();
                      }
                      else if( state_key == STATE_KEY_CREATE ){  
                        setStateKeyCREATE();                      
                      }   
                      else if( state_key == STATE_KEY_CREATED ){
                        setStateKeyCREATED();
                      }
                      else if( state_key == STATE_KEY_CANCEL ){
                        setStateKeyCANCEL();
                      }
                      else if( state_key == STATE_KEY_UPLOAD ){
                        setStateKeyUPLOAD();
                      }                                                                                        
                      else if( state_key == STATE_KEY_UPLOADED ){
                        setStateKeyUPLOADED();
                      }
                      else{
                        setStateKeyINITIAL();                      
                      }
                    }
                    else{
                      setStateKeyCREATED();
                    }
	                }
	                else{
	                  outInfo("Info - loadPriKey: found no stored Key!");
	                }
	              }
	              else{
	                outInfo("Fatal Error - loadPriKey: UI was not inited correct!");
	              }	              
	            }
            }
            else{
            	document.getElementById('localStorePriKey').checked = true;
            }	          
        	}
        	else{
        		myPrimeID = null;
            document.getElementById('localStorePriKey').checked = true;
        		outInfo("Info - loadPriKey: no Prime-ID in local-Store!");
        	}
        }
        else{
          outInfo("Info - loadPriKey: local-Store is not available! Please use an up-to-date  Browser!");
        }
      }
      function saveThreads(){
        if (document.getElementById('localStoreMessages')) {
          if(myPrimeID){
            if (document.getElementById('localStoreMessages').checked) {
            	localStorage.setItem("localStoreMessages" + myPrimeID, 'Y');
              if(msgSelectedDiv){
                msgSelectedDiv.className = msgSelectedDiv.className.substring(0, msgSelectedDiv.className.length-4); 
                msgSelectedDiv = null;            
              }
            	localStorage.setItem("threads" + myPrimeID, document.getElementById("threads").innerHTML);
            	localStorage.setItem("threadsAlpha" + myPrimeID, document.getElementById("formContactsOrdertypeAlpha").innerHTML);
            	localStorage.setItem("threadsManuel" + myPrimeID, document.getElementById("formContactsOrdertypeManuel").innerHTML);
              //Hint: JSON.stringify(threadsAlpha);
            }
            else{
            	localStorage.setItem("localStoreMessages" + myPrimeID, 'N');
            }
          }
        	else{
        		outInfo("Info - savePriKey: No Prime-ID to store! Please setup!");
        	}
        }
        else{
          outInfo("Info - saveThreads: local-Store is not available! Please update your Browser!");
        }
      }
      function loadThreads(selThread){
        if (document.getElementById('localStoreMessages')) {
        	var localStoreMessagesStr = localStorage.getItem("localStoreMessages" + myPrimeID);
        	if(localStoreMessagesStr) {
	          if(localStoreMessagesStr === 'N') {
	            document.getElementById('localStoreMessages').checked = false;
	            outInfo("Info - saveThreads: local-Store not used for Contacts!");
	            return false;
	          }
          }
          document.getElementById('localStoreMessages').checked = true;
        }
        else{
          outInfo("Info - loadThreads: local-Store is not available! Please update your Browser!");
          return false;
        }        
      	if(! myPrimeID){
      		outInfo("Info - loadThreads: no Prime-ID available!");
      		return false;
      	}
        var currentThreadL = null;
        var contactAlphaSelectedL = null;
        var threadLinkManuelL = null;
        var t = localStorage.getItem("threads" + myPrimeID);
        if(t){
          var parentNode = document.getElementById("threads");
          parentNode.innerHTML = t;                                   // UEBERSCHREIBEN! Nicht leer machen, um es neu zu erstellen ...
          var tnodes = parentNode.childNodes;
          for(var i = 0; i < tnodes.length; i++){
            var nodes = tnodes[i].lastChild.childNodes;
            tnodes[i].lastChild.style.display='none';
            tnodes[i].firstChild.style.display='none';
            for(var j = 0; j < nodes.length; j++){
              if(! nodes[j].onclick){
                nodes[j].onclick = handleSelectMsg;
              }
              if( nodes[j].style.fontWeight === 'bold' ){
                // TODO selektiere die damals ausgewaehlte Nachricht ...
              }
            }
          }
        }
        var tm = localStorage.getItem("threadsManuel" + myPrimeID);
        if(tm){
          var parentNode = document.getElementById("formContactsOrdertypeManuel");
          parentNode.innerHTML = tm;                                  // UEBERSCHREIBEN! Nicht leer machen, um es neu zu erstellen ...
          var nodes = parentNode.childNodes;
          for(var i = 0; i < nodes.length; i++){
            if(! nodes[i].onclick){
              nodes[i].onclick = handleSelectThread;
              nodes[i].ondrop = drop;
              nodes[i].draggable = "true";
              nodes[i].ondragover = allowDrop;
              nodes[i].ondragstart = drag;
            }
            if( nodes[i].style.fontWeight === 'bold' ){
              var idStr = nodes[i].id.substring(1, nodes[i].id.length);
              currentThreadL = document.getElementById( 'x' + idStr );
              contactManuelSelectedL = nodes[i];
              //document.getElementById('formCurrentEdit').style.display='block';
              //document.getElementById('formCurrentMessages').style.display='block';
              //contactsOrdertypeHide();
            }
          }
        }
        var savedThreadsAlpha = localStorage.getItem("threadsManuel" + myPrimeID);
        if(savedThreadsAlpha){
          var parentNode = document.getElementById("formContactsOrdertypeAlpha");
          parentNode.innerHTML = savedThreadsAlpha;                   // UEBERSCHREIBEN! Nicht leer machen, um es neu zu erstellen ...
          var nodes = parentNode.childNodes;
          for(var i = 0; i < nodes.length; i++){
            if(! nodes[i].onclick){
              nodes[i].onclick = handleSelectThread;
            }
            if( nodes[i].style.fontWeight === 'bold' ){
              contactAlphaSelectedL = nodes[i];
            }
          }
        }
        if(selThread && contactAlphaSelectedL && contactManuelSelectedL && currentThreadL){
          handleSelectThreadE(currentThreadL, contactAlphaSelectedL, threadLinkManuelL, idStr, currentThreadL.firstChild.firstChild.firstChild.data);
          return true;
        }
        else{
          currentThread = null;
          contactAlphaSelected = null;
          threadLinkManuel = null;
          return false;
        }
        // TODO Listener installieren!!!
      }
      /** Manage Contacts **/
      function saveNewContact(){
        var contactKey = document.getElementById('newKey').firstChild.data;
        var contactNick = document.getElementById('newContactNick').value;
        var contactID = document.getElementById('newcontactID').value;
        if((!contactKey) || contactKey === "" || contactKey === " " || contactKey === "&nbsp;"){
          outInfo("Fatal Error - saveNewContact: public Key of Contact is not available!");
          return;
        }
        if(contactKey.length < 96){
          outInfo("Fatal Error - saveNewContact: public Key of Contact is to small!");
          return;
        }
        var data = saveNewContactParam(contactID, contactKey, contactNick);
        contactsCreateHide();
        handleSelectThreadE(data[0], data[1], data[2], contactID, contactNick);
        document.getElementById('newKey').firstChild.data = "";
        document.getElementById('newContactNick').value = "";
        document.getElementById('newcontactID').value = "";
      }
      function saveNewContactParam(contactID, contactKey, contactNick){
        var ea = document.getElementById( "w" + contactID );
        if(ea){
          outInfo("Error - saveNewContactParam: Contact already exists in manuel sorted List!");
          return;
        }
        document.getElementById('newKey').firstChild.data = '';
        document.getElementById('newcontactID').value = '';
        var aA = document.createElement('a');
        aA.id = "w" + contactID;
        aA.href = "#";
        aA.addEventListener('click', handleSelectThread, false);
        aA.appendChild( document.createTextNode(contactNick) );
        if(! insertAlpha(document.getElementById("formContactsOrdertypeAlpha"), aA) ){
          outInfo("Error - saveNewContactParam: Contact already exists in Alphabetic List!");
          return;
        }
        var a = document.createElement('a');
        a.id = "v" + contactID;
        a.href = "#end";
        a.onclick = handleSelectThread;
        a.ondrop = drop;
        a.draggable = "true";
        a.ondragover = allowDrop;
        a.ondragstart = drag;
        a.appendChild( document.createTextNode(contactNick) );
        document.getElementById("formContactsOrdertypeManuel").appendChild( a );

        var contactDiv = document.createElement('div');
        contactDiv.id = "x" + contactID;

        var editDiv = document.createElement('div');
        editDiv.className = "contactEdit";
        editDiv.style.display='none';////!!!!!

        var contactsPrimeID = document.createElement('div');
        contactsPrimeID.className = "contactsPrimeID";
        contactsPrimeID.appendChild( document.createTextNode(contactID) );
        editDiv.appendChild( contactsPrimeID );
        editDiv.appendChild( document.createElement('br') );

        var keyTextarea = document.createElement('pre');
        keyTextarea.id = "z" + contactID;
        keyTextarea.className = "contactsPubKey";
        keyTextarea.appendChild( document.createTextNode(contactKey) );
        editDiv.appendChild( keyTextarea );

        contactDiv.appendChild( editDiv );
        var msgDiv = document.createElement('div');
        msgDiv.className = "contactMsg";
        msgDiv.id = "u" + contactID;
        msgDiv.style.display='none';////!!!!!
        contactDiv.appendChild( msgDiv );
        document.getElementById("threads").appendChild(contactDiv);

        return [contactDiv, a, aA];
      }
      function deleteCurrentThread() {
          document.getElementById('menuCurrentItemEdit').firstChild.data = "-";
          currentHide();
          var p = currentThread.parentNode;
          p.removeChild( currentThread );
          p = contactAlphaSelected.parentNode;
          p.removeChild( contactAlphaSelected );
          p = contactManuelSelected.parentNode;
          p.removeChild( contactManuelSelected );
      }
      function handleNickChanged() {
        document.getElementById('menuCurrentItemEdit').firstChild.data = document.getElementById('Nick').value;
        if(contactAlphaSelected){
          contactAlphaSelected.firstChild.data = document.getElementById('Nick').value;
          var p = contactAlphaSelected.parentNode;
          var cutted = p.removeChild( contactAlphaSelected );
          insertAlpha(p, cutted);
        }
        if(contactManuelSelected){
          contactManuelSelected.firstChild.data = document.getElementById('Nick').value;
        }
      }
      function insertAlpha(parentNode, nodeToInsert) {
        var minIndex = 0;
        var maxIndex = parentNode.childNodes.length - 1;
        var currentIndex;
        var currentNode;
        while (minIndex <= maxIndex) {
          currentIndex = (minIndex + maxIndex) / 2 | 0;
          currentNode = parentNode.childNodes[currentIndex];
          if ( !(currentNode.firstChild) || !(currentNode.firstChild.data) ) {
            minIndex = currentIndex + 1;
          }
          else{
            if (currentNode.firstChild.data < nodeToInsert.firstChild.data) {
              minIndex = currentIndex + 1;
            }
            else{
              if (currentNode.firstChild.data > nodeToInsert.firstChild.data) {
                maxIndex = currentIndex - 1;
              }
              else {
                outInfo("Info - insertAlpha: List Entry exists: " + currentNode.firstChild.data);
                return false;
              }
            }
          }
        }
        if(minIndex == currentIndex + 1){    //After
          if( currentNode.nextSibling ){
            parentNode.insertBefore(nodeToInsert, currentNode.nextSibling);
          }
          else{
            parentNode.appendChild(nodeToInsert);
          }
          return true;//minIndex;
        }
        else{                               //Before
          parentNode.insertBefore(nodeToInsert, currentNode);
          return true;//currentIndex;
        }
      }
      /** UI Drag-Drop Contacts **/
      function allowDrop(ev){
        ev.preventDefault();
      }
      function drag(ev){
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.dropEffect = 'move';
        ev.dataTransfer.setData('text/html', '...');
        contactManuelDragged = ev.target;
      }
      function drop(ev){
        ev.preventDefault();
        if(contactManuelDragged){
          if(contactManuelDragged !== ev.target){
            var cutted = contactManuelDragged.parentNode.removeChild( contactManuelDragged );
            contactManuelDragged = null;
            ev.target.parentNode.insertBefore(cutted, ev.target);
          }
          else{
            outInfo("Fatal Error - drop: droped Object does not equal dragged Object! Did you klick so fast?");
          }
        }
      }
      /** Manage Messages **/
      function deleteMsg(){
        if(msgSelectedDiv){
          msgSelectedDiv.parentElement.removeChild(msgSelectedDiv);
          msgSelectedDiv = null;
          document.getElementById('buttonDecrypt').style.display='none';
          document.getElementById('menuCurrentItemDelete').className = 'i il dis';
        	if(! currentThread.lastChild.firstChild){
						document.getElementById('menuCurrentItemDeleteAll').className = "i il dis";
					}          
        }
      }
      function deleteMsgAll(){
        if(currentThread){
        	var msgNode = currentThread.lastChild;
        	while (msgNode.firstChild) {
    				msgNode.removeChild(msgNode.firstChild);
					}
					document.getElementById('menuCurrentItemDeleteAll').className = "i il dis";
        }
      }      
      /** Tools **/
      function outInfo(str){
        document.getElementById('log').appendChild( document.createTextNode(str) );
        document.getElementById('log').appendChild( document.createElement('br') );
      }
      function outLock(str) {
      	if(str){
      		outInfo(str);
      	}
        if(running){
          if(! str){
            running = false;
            document.getElementById('out').firstChild.data = "-";
            document.getElementById('creatingBar').style.animationPlayState="paused";
            return true;
          }
        }
        else{
          if(str){
            running = true;
            document.getElementById('creatingBar').style.animationPlayState="running";
            return true;
          }
        }
        return false;
      }
      function removeWhiteSpace(str) {
        return str;//TODO implement!
      }
      /** UI Setup **/
      function init(){
        initUiNodes();
        initData();
      }
      function initData(){
        loadPriKey();
        if(document.getElementById('key').value && document.getElementById('Address').value){ // TODO was soll das mit Address ?
          if( ! loadThreads(true) ){
            contactsShow();
          }
        }
        else{
          loadThreads(false);
          keyShow();
        }
      }      
      function initUiNodes(){
        //document.getElementById('Address').value = "";
        var localStorePriKey = document.getElementById('localStorePriKey');
        var localStoreMessages = document.getElementById('localStoreMessages');
        document.getElementById("formPers").innerHTML = null; // leer machen, um es neu zu erstellen ...
        if(localStorage){
          document.getElementById('formPers').appendChild( document.createElement('br') );   // TODO wozu das?
          if(! localStorePriKey){
            localStorePriKey = document.createElement('input');
            localStorePriKey.type="checkbox";
            localStorePriKey.id="localStorePriKey";
            localStorePriKey.name="localStorePriKey";
            localStorePriKey.value="localStorePriKey";
            if(! localStorage.localStorePriKey){
              localStorage.localStorePriKey = 'Y';
            }
          }
          document.getElementById('formPers').appendChild( localStorePriKey );
          document.getElementById('formPers').appendChild( document.createTextNode("use localStorage to store your Private Key") );
          document.getElementById('formPers').appendChild( document.createElement('br') );
          if(! localStoreMessages){
            localStoreMessages = document.createElement('input');
            localStoreMessages.type="checkbox";
            localStoreMessages.id="localStoreMessages";
            localStoreMessages.name="localStoreMessages";
            localStoreMessages.value="localStoreMessages";
            if(! localStorage.localStoreMessages){
              localStorage.localStoreMessages = 'Y';
            }
          }
          document.getElementById('formPers').appendChild( localStoreMessages );
          document.getElementById('formPers').appendChild( document.createTextNode("use localStorage to store your Messages") );
        }
        var FileApiOk = false;
        // Check for the various File API support.
        if (! window.File) {
          outInfo('Info - initUiNodes: The File APIs are not fully supported in this browser (File).');
        }
        else if (! window.FileReader) {
          outInfo('Info - initUiNodes: The File APIs are not fully supported in this browser (FileReader).');
        }
        else if (! window.FileList) {
          outInfo('Info - initUiNodes: The File APIs are not fully supported in this browser (FileList).');
        }
        else if (! window.Blob) {
          outInfo('Info - initUiNodes: The File APIs are not fully supported in this browser (Blob).');
        }
        else {
          // Great success! All the File APIs are supported.
          FileApiOk = true;
        }
        if (typeof String.prototype.endsWith !== 'function') {
          String.prototype.endsWith = function(suffix) {
              return this.indexOf(suffix, this.length - suffix.length) !== -1;
          };
        }
        /*
        if(window.Blob){
          document.getElementById('saveAs').style.display='block';
        }
        */
        var pasteText = "Use Ctrl + V to paste your key-string here:";
        var dropText = "Drop your private pem-file here:";
        var openText = "Use the File-Dialog to open your private pem-file:";
        var keyTextarea = document.getElementById('key');
        if(! keyTextarea){
          keyTextarea = document.createElement('textarea');
          keyTextarea.name='key';
          keyTextarea.id='key';
          keyTextarea.cols='65';
          keyTextarea.rows='6';
        }
        document.getElementById("formKeyLoad2").innerHTML = null; // leer machen, um es neu zu erstellen ...
        if(keyTextarea.addEventListener){// TODO Listener schon da?
          keyTextarea.addEventListener('change', handleKeyChanged);
        }
        if(FileApiOk){
          var fileSelectorOK = false;
          var fileDropDiv = document.createElement('div');
          if( fileDropDiv.addEventListener && typeof(fileDropDiv.addEventListener) == "function" ){
            fileDropDiv.id = 'drop_zone';
            var hintPasteSpan = document.createElement('span');
            hintPasteSpan.className='hint';
            hintPasteSpan.appendChild( document.createTextNode(pasteText) );
            fileDropDiv.appendChild( hintPasteSpan );
            fileDropDiv.appendChild( document.createElement('br') );
            fileDropDiv.appendChild( keyTextarea );
            fileDropDiv.addEventListener('dragover', handleFileDragOver, false);
            fileDropDiv.addEventListener('drop', handleFileDrop, false);
            var hintDropSpan = document.createElement('span');
            hintDropSpan.className='hint';
            hintDropSpan.appendChild( document.createTextNode(dropText) );
            document.getElementById('formKeyLoad2').appendChild( hintDropSpan );
            document.getElementById('formKeyLoad2').appendChild( document.createElement('br') );
            document.getElementById('formKeyLoad2').appendChild(fileDropDiv);
            fileSelectorOK = true;
          }
          else{
            document.getElementById('formKeyLoad2').appendChild( keyTextarea );
          }
          var fileInput = document.createElement('input');
          if( fileInput.addEventListener && typeof(fileInput.addEventListener) == "function" ){
            fileInput.id = 'fileInput';
            fileInput.type = 'file';
            fileInput.name = 'files[]';
            fileInput.addEventListener('change', handleFileSelect, false);
            var hintOpenSpan = document.createElement('span');
            hintOpenSpan.className='hint';
            hintOpenSpan.appendChild( document.createTextNode(openText) );
            document.getElementById('formKeyLoad2').appendChild( document.createElement('br') );
            document.getElementById('formKeyLoad2').appendChild( hintOpenSpan );
            document.getElementById('formKeyLoad2').appendChild( document.createElement('br') );
            document.getElementById('formKeyLoad2').appendChild(fileInput);
            fileSelectorOK = true;
          }
          if(fileSelectorOK){
            var selectedFileP = document.createElement('p');
            selectedFileP.id = 'selectedFile';
            document.getElementById('formKeyLoad2').appendChild(selectedFileP);
          }
        }
        else{
          var hintPasteSpan = document.createElement('span');
          hintPasteSpan.className='hint';
          hintPasteSpan.appendChild( document.createTextNode(pasteText) );
          document.getElementById('formKeyLoad2').appendChild( hintPasteSpan );
          document.getElementById('formKeyLoad2').appendChild( document.createElement('br') );
          document.getElementById('formKeyLoad2').appendChild( keyTextarea );
        }
      }
      /** UI Manipulation Handle User-Actions **/
      function handleAddressChanged(){
      	var newId = removeWhiteSpace(document.getElementById('Address').value);
      	if(myPrimeID){
	      	if(newId !== myPrimeID){
	      		// is there a key for the old ID?
            function callback(keyTarget, req) {
              if(req.readyState==4 && req.status==200){
              	if(req.responseText === 'ERROR???'){// TODO definiere ein Protokoll auf server-seite!
              		myPrimeID = newId;
              	}
              	else{
              		saveThreadsPriKey();
              		myPrimeID = newId;
              		initData();
              	}
              }
            };	
            downloadKey2(myPrimeID, null, callback);// TODO schoenere funktion ...
		      	document.getElementById('menuMainItemKey').firstChild.data = myPrimeID;            
	      	}      		
      	}
      	else{
      		myPrimeID = newId;
	      	document.getElementById('menuMainItemKey').firstChild.data = myPrimeID;
      	}
      }
      function handleKeyChanged(){
        var key = document.getElementById('key').value;
        document.getElementById('priKeyPre').firstChild.data = key;
        if(opendPrivateKey.parseKey(key)){
          var pubPrinted = opendPrivateKey.getPublicKey(); // TODO: nur bei Setup mode wird publicKey gebraucht
          document.getElementById('publicKey').firstChild.data = pubPrinted;        
        }
        //keyShow();
      }
      function handleSelectMsg(e){
        var ea = e.target;
        if(ea){
          if(msgSelectedDiv){
            //msgSelectedDiv.style.fontWeight='normal';
            msgSelectedDiv.className = msgSelectedDiv.className.substring(0, msgSelectedDiv.className.length-4); 
            if(msgSelectedDiv === ea){
              msgSelectedDiv = null;
              document.getElementById('buttonDecrypt').style.display='none';
              document.getElementById('menuCurrentItemDelete').className = 'i il dis';
              return;
            }
          }
          msgSelectedDiv = ea;
          //msgSelectedDiv.style.fontWeight='bold';
          if(msgSelectedDiv.className === "messageCrypted"){
            msgSelectedDiv.className = "messageCrypted sel";
            document.getElementById('buttonDecrypt').style.display='block';
          }
          else{
            msgSelectedDiv.className = msgSelectedDiv.className + " sel";
          }
          document.getElementById('menuCurrentItemDelete').className = 'i il ena';
        }
      }
      function handleSelectThread(e){
        var ea = e.target;
        if(ea){
          if(msgSelectedDiv){
            //msgSelectedDiv.style.fontWeight='normal';
            msgSelectedDiv.className = msgSelectedDiv.className.substring(0, msgSelectedDiv.className.length-4);
            msgSelectedDiv = null;
            document.getElementById('buttonDecrypt').style.display='none';
            document.getElementById('menuCurrentItemDelete').className = 'i il dis';
          }
          var idStr = ea.id;
          idStr = idStr.substring(1, idStr.length);
          var nameStr = ea.firstChild.data;
          document.getElementById('Nick').value = nameStr;
          var el = document.getElementById( 'x' + idStr );
          threadLinkAlpha = document.getElementById( 'w' + idStr );
          threadLinkManuel = document.getElementById( 'v' + idStr );
          handleSelectThreadE(el, threadLinkAlpha, threadLinkManuel, idStr, nameStr);
       }
      }
      function handleSelectThreadE(el, threadLinkAlpha, threadLinkManuel, idStr, nameStr){
        if(!currentThread){
          document.getElementById('menuCurrentItemEdit').firstChild.data = nameStr;
          //document.getElementById('menuMainItemCurrent').style.fontWeight='bold';
          //document.getElementById('formCurrentEdit').style.display='block';
          currentThread = el;
          contactAlphaSelected = threadLinkAlpha;
          contactManuelSelected = threadLinkManuel;

          /*
          currentThread.style.display='block';
          contactAlphaSelected.style.fontWeight='bold';
          contactManuelSelected.style.fontWeight='bold';
          document.getElementById('formCurrentMessages').style.display='block';
          contactsOrdertypeHide();
          */
          currentShow();
        }
        else{
          if(currentThread !== el){
            /*
            currentThread.style.display='none';
            contactAlphaSelected.style.fontWeight='normal';
            contactManuelSelected.style.fontWeight='normal';
            */
            currentHide();
            currentThread = el;
            contactAlphaSelected = threadLinkAlpha;
            contactManuelSelected = threadLinkManuel;
          }
          /*
          currentThread.style.display='block';
          contactAlphaSelected.style.fontWeight='bold';
          contactManuelSelected.style.fontWeight='bold';
          document.getElementById('menuMainItemCurrent').style.fontWeight='bold';
          */
          //contactsOrdertypeHide();
          document.getElementById('menuCurrentItemEdit').firstChild.data = nameStr;// TODO hier oder in if oben? was ist el?
          currentShow();
        }
      }
      /** UI Manipulation Show/Hide **/
      function keyToggle() {
        if(document.getElementById('menuKey').style.display=='block'){
          keyHide();
        }
        else{
          keyShow();
        }
      }
      function keyShow() {
        var k = document.getElementById('key');
        if(k){
          document.getElementById('menuMainItemKey').style.fontWeight='bold';
          contactsHide();
          currentHide();
          document.getElementById('menuKey').style.display='block';
          // open default submenu
          keyLoadShow();
        }
        else{
          outInfo("Fatal Error - keyShow: UI was not inited correct!");
        }
      }
      function keyHide() {
        document.getElementById('menuMainItemKey').style.fontWeight='normal';
        document.getElementById('menuKey').style.display='none';
        keySetupHide();
        document.getElementById('formKeyLoad0').style.display='none';
        document.getElementById('formKeyLoad2').style.display='none';
        keySettingHide();
      }

      function keyLoadToggle() {
        if(document.getElementById('menuKeyItemLoad').style.fontWeight=='bold'){
          keyLoadHide();
        }
        else{
          keyLoadShow();
        }
      }
      function keyLoadShow() {
        document.getElementById('menuKeyItemLoad').style.fontWeight='bold';
        document.getElementById('menuKeyItemSetup').style.fontWeight='normal';
        document.getElementById('formKeySetup1').style.display='none';
        document.getElementById('formKeyLoad1').style.display='block';
        //document.getElementById('formKeySetup2').style.display='none';
        document.getElementById('formKeySetup3').style.display='none';
        document.getElementById('formKeyLoad0').style.display='block';
        document.getElementById('formKeyLoad2').style.display='block';
        document.getElementById('formKeySetup4').style.display='none';
        keySettingHide();
      }
      function keyLoadHide() {
        document.getElementById('menuKeyItemLoad').style.fontWeight='normal';
        document.getElementById('formKeyLoad1').style.display='none';
        document.getElementById('formKeyLoad0').style.display='none';
        document.getElementById('formKeyLoad2').style.display='none';
      }

      function keySetupToggle() {
        if(document.getElementById('formKeySetup1').style.display=='block'){
          keySetupHide();
        }
        else{
          keySetupShow();
        }
      }
      function keySetupShow() {
        document.getElementById('menuKeyItemLoad').style.fontWeight='normal';
        document.getElementById('menuKeyItemSetup').style.fontWeight='bold';
        document.getElementById('formKeySetup1').style.display='block';
        document.getElementById('formKeyLoad1').style.display='block';
        //document.getElementById('formKeySetup2').style.display='block';
        document.getElementById('formKeySetup3').style.display='block';
        document.getElementById('formKeyLoad0').style.display='none';
        document.getElementById('formKeyLoad2').style.display='none';
        document.getElementById('formKeySetup4').style.display='block';
        keySettingHide();
      }
      function keySetupHide() {
        document.getElementById('menuKeyItemSetup').style.fontWeight='normal';
        document.getElementById('formKeySetup1').style.display='none';
        document.getElementById('formKeyLoad1').style.display='none';
        //document.getElementById('formKeySetup2').style.display='none';
        document.getElementById('formKeySetup3').style.display='none';
        //document.getElementById('formKeyLoad0').style.display='none';
        //document.getElementById('formKeyLoad2').style.display='none';
        document.getElementById('formKeySetup4').style.display='none';
      }

      function keySettingToggle() {
        if(document.getElementById('formKeySetting').style.display==='block'){
          keySettingHide();
        }
        else{
          keySettingShow();
        }
      }
      function keySettingShow() {
        document.getElementById('menuKeyItemLoad').style.fontWeight='normal';
        document.getElementById('menuKeyItemSetting').style.fontWeight='bold';
        document.getElementById('formKeySetting').style.display='block';
        document.getElementById('formKeyLoad0').style.display='none';
        document.getElementById('formKeyLoad2').style.display='none';
        keySetupHide();
      }
      function keySettingHide() {
        document.getElementById('menuKeyItemSetting').style.fontWeight='normal';
        document.getElementById('formKeySetting').style.display='none';
      }

      function contactsToggle() {
        if(document.getElementById('menuContacts').style.display==='block'){
          contactsHide();
        }
        else{
          contactsShow();
        }
      }
      function contactsShow() {
        document.getElementById('menuMainItemContacts').style.fontWeight='bold';
        document.getElementById('menuContacts').style.display='block';
        currentHide();
        keyHide();
        contactsOrdertypeShow();
      }
      function contactsHide() {
        document.getElementById('menuMainItemContacts').style.fontWeight='normal';
        document.getElementById('menuContacts').style.display='none';
        contactsOrdertypeHide();
        contactsCreateHide();
      }

      function contactsOrdertypeToggle() {
        if(document.getElementById('formContactsOrdertype').style.display==='block'){
          contactsOrdertypeSwitch();
        }
        else{
          contactsOrdertypeShow();
        }
      }
      function contactsOrdertypeShow() {
        document.getElementById('formContactsOrdertype').style.display='block';
        contactsCreateHide();
      }
      function contactsOrdertypeHide() {
        document.getElementById('formContactsOrdertype').style.display='none';
      }
      function contactsOrdertypeSwitch() {
        if(document.getElementById('formContactsOrdertypeManuel').style.display==='block'){
          document.getElementById('menuContactsItemOrdertype').style.fontWeight='bold';
          document.getElementById('formContactsOrdertypeManuel').style.display='none';
          document.getElementById('formContactsOrdertypeAlpha').style.display='block';
        }
        else{
          document.getElementById('menuContactsItemOrdertype').style.fontWeight='normal';
          document.getElementById('formContactsOrdertypeManuel').style.display='block';
          document.getElementById('formContactsOrdertypeAlpha').style.display='none';
        }
      }

      function showContactsNew() {
        // TODO FIlter baun
      }
      function hideContactsNew() {
        // TODO FIlter baun
      }

      function contactsCreateToggle() {
        if(document.getElementById('formContactsCreate').style.display=='block'){
          contactsCreateHide();
        }
        else{
          contactsCreateShow();
        }
      }
      function contactsCreateShow() {
        document.getElementById('menuContactsItemCreate').style.fontWeight='bold';
        document.getElementById('formContactsCreate').style.display='block';
        contactsOrdertypeHide();
      }
      function contactsCreateHide() {
        document.getElementById('menuContactsItemCreate').style.fontWeight='normal';
        document.getElementById('formContactsCreate').style.display='none';
      }

      function currentToggle() {
        if(document.getElementById('menuCurrent').style.display==='block'){
          //document.getElementById('threads').style.display='none';// TODO so kann man Details behalten ...
          currentHide();
        }
        else{
          //document.getElementById('threads').style.display='block';// TODO so kann man Details behalten ...
          currentShow();
        }
      }
      function currentShow() {
        //document.getElementById('menuMainItemCurrent').style.fontWeight='bold';
        document.getElementById('menuCurrent').style.display='block';
        contactsHide();
        keyHide();
        currentMessagesShow();
      }
      function currentHide() {
        //document.getElementById('menuMainItemCurrent').style.fontWeight='normal';
        document.getElementById('menuCurrent').style.display='none';
        currentMessagesHide();
        currentEditHide();
        currentNewHide();
      }

			/*
      function currentMessagesToggle() {
        if(document.getElementById('menuCurrentItemMessages').style.fontWeight==='bold'){
          currentMessagesHide();
        }
        else{
          currentMessagesShow();
        }
      }
      */
      function currentMessagesShow() {
        if(currentThread){
          //document.getElementById('menuCurrentItemMessages').style.fontWeight='bold';
          var ms = currentThread.lastChild;
          currentThread.lastChild.style.display='block';
          currentEditHide();
        	if (currentThread.lastChild.firstChild) {
    				document.getElementById('menuCurrentItemDeleteAll').className = "i il ena";
					}
					else{
						document.getElementById('menuCurrentItemDeleteAll').className = "i il dis";
					}
        }
      }
      function currentMessagesHide() {
        if(currentThread){
          //document.getElementById('menuCurrentItemMessages').style.fontWeight='normal';
          currentThread.lastChild.style.display='none';
        }
      }

      function currentNewToggle() {
        if(document.getElementById('formCurrentNew').style.display==='block'){
          currentNewHide();
        }
        else{
          currentMessagesShow();
          currentNewShow();
        }
      }      
      function currentNewShow() {
      	document.getElementById('formCurrentNew').style.display='block';
      	document.getElementById('menuCurrentItemNew').style.fontWeight='bold';
      	var heightHeader = document.getElementById('header').offsetHeight;
      	var HeightForm = document.getElementById('formCurrentNew').offsetHeight;
      	document.getElementById('main').style.paddingTop = (heightHeader + HeightForm).toString() + "px";
        document.getElementById("msg").focus();
      	window.scrollTo(0, document.body.scrollHeight);
      }
      function currentNewHide() {
				document.getElementById('formCurrentNew').style.display='none';
				document.getElementById('menuCurrentItemNew').style.fontWeight='normal';
				document.getElementById('main').style.paddingTop = "5.55em";// TODO lieber am Anfang orginal auslesen ...
				window.scrollTo(0, document.body.scrollHeight);
      } 
      /*
			function setCursorAtTheEnd(aTextArea,aEvent) {
				  //aTextArea.value+='x';
			    var end=aTextArea.value.length;
			    if (aTextArea.setSelectionRange) {
			        setTimeout(aTextArea.setSelectionRange,0,[end,end]);  
			    } else { // IE style
			        var aRange = aTextArea.createTextRange();
			        aRange.collapse(true);
			        aRange.moveEnd('character', end);
			        aRange.moveStart('character', end);
			        aRange.select();    
			    }
			    aEvent.preventDefault();
			    return false;
			} 
      */
      
      function currentEditToggle() {
        if(document.getElementById('formCurrentEdit').style.display=='block'){
          currentEditHide();
          currentMessagesShow();
        }
        else{
          currentEditShow();
        }
      }
      function currentEditShow() {
        if(currentThread){
          document.getElementById('menuCurrentItemEdit').style.fontWeight='bold';
          document.getElementById('formCurrentEdit').style.display='block';
          currentThread.firstChild.style.display='block';
          currentMessagesHide();
          currentNewHide();
        }
      }
      function currentEditHide() {
        if(currentThread){
          document.getElementById('menuCurrentItemEdit').style.fontWeight='normal';
          document.getElementById('formCurrentEdit').style.display='none';
          currentThread.firstChild.style.display='none';
        }
      }

      window.onbeforeunload = function() { saveThreadsPriKey(); };
      
