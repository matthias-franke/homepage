//



/**
 * Retrieve the hexadecimal value (as a string) of the current ASN.1 element
 * @returns {string}
 * @public
 */
ASN1.prototype.getHexStringValue = function(){
    var hexString = this.toHexString();
    var offset = this.header * 2;
    var length = this.length * 2;
    return hexString.substr(offset,length);
};

/**
 * Method to parse a pem encoded string containing both a public or private key.
 * The method will translate the pem encoded string in a der encoded string and
 * will parse private key and public key parameters. This method accepts public key
 * in the rsaencryption pkcs #1 format (oid: 1.2.840.113549.1.1.1). 
 * @todo Check how many rsa formats use the same format of pkcs #1. The format is defined as:
 * PublicKeyInfo ::= SEQUENCE {
 *   algorithm       AlgorithmIdentifier,
 *   PublicKey       BIT STRING
 * }
 * Where AlgorithmIdentifier is: 
 * AlgorithmIdentifier ::= SEQUENCE {
 *   algorithm       OBJECT IDENTIFIER,     the OID of the enc algorithm
 *   parameters      ANY DEFINED BY algorithm OPTIONAL (NULL for PKCS #1)
 * }
 * and PublicKey is a SEQUENCE encapsulated in a BIT STRING
 * RSAPublicKey ::= SEQUENCE {
 *   modulus           INTEGER,  -- n
 *   publicExponent    INTEGER   -- e
 * }
 * it's possible to examine the structure of the keys obtained from openssl using 
 * an asn.1 dumper as the one used here to parse the components: http://lapo.it/asn1js/
 * @argument {string} pem the pem encoded string, can include the BEGIN/END header/footer
 * @private
 */
RSAKey.prototype.parseKey = function(pem) {
    try{
        var reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
        var der = reHex.test(pem) ? Hex.decode(pem) : Base64.unarmor(pem);
        var asn1 = ASN1.decode(der);
        if (asn1.sub.length === 9){
            // the data is a Private key
            //in order
            //Algorithm version, n, e, d, p, q, dmp1, dmq1, coeff
            //Alg version, modulus, public exponent, private exponent, prime 1, prime 2, exponent 1, exponent 2, coefficient
            var modulus = asn1.sub[1].getHexStringValue(); //bigint
            this.n = parseBigInt(modulus, 16);

            var public_exponent = asn1.sub[2].getHexStringValue(); //int
            this.e = parseInt(public_exponent, 16);

            var private_exponent = asn1.sub[3].getHexStringValue(); //bigint
            this.d = parseBigInt(private_exponent, 16);

            var prime1 = asn1.sub[4].getHexStringValue(); //bigint
            this.p = parseBigInt(prime1, 16);

            var prime2 = asn1.sub[5].getHexStringValue(); //bigint 
            this.q = parseBigInt(prime2, 16);

            var exponent1 = asn1.sub[6].getHexStringValue(); //bigint
            this.dmp1 = parseBigInt(exponent1, 16);

            var exponent2 = asn1.sub[7].getHexStringValue(); //bigint
            this.dmq1 = parseBigInt(exponent2, 16);

            var coefficient = asn1.sub[8].getHexStringValue(); //bigint
            this.coeff = parseBigInt(coefficient, 16);

        }else if (asn1.sub.length === 2){
            //Public key
            //The data PROBABLY is a public key
            var bit_string = asn1.sub[1];
            var sequence   = bit_string.sub[0];

            var modulus = sequence.sub[0].getHexStringValue();
            this.n = parseBigInt(modulus, 16);
            var public_exponent = sequence.sub[1].getHexStringValue();
            this.e = parseInt(public_exponent, 16);

        }else{
            return false;
        }
        return true;
    }catch(ex){
        return false;
    }
};

////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieve the pem encoded private key
 * @returns {string} the pem encoded private key with header/footer
 * @public
 */
RSAKey.prototype.getPrivateKey = function() {
    var key = "-----BEGIN RSA PRIVATE KEY-----\n";
    key += this.wordwrap(this.getPrivateBaseKeyB64()) + "\n";
    key += "-----END RSA PRIVATE KEY-----";
    return key;
};

/**
 * base64 (pem) encoded version of the DER encoded representation
 * @returns {string} pem encoded representation without header and footer
 * @public
 */
RSAKey.prototype.getPrivateBaseKeyB64 = function (){
    return hex2b64(this.getPrivateBaseKey());
};

/**
 * Translate rsa parameters in a hex encoded string representing the rsa key.
 * The translation follow the ASN.1 notation :
 * RSAPrivateKey ::= SEQUENCE {
 *   version           Version,
 *   modulus           INTEGER,  -- n
 *   publicExponent    INTEGER,  -- e
 *   privateExponent   INTEGER,  -- d
 *   prime1            INTEGER,  -- p
 *   prime2            INTEGER,  -- q
 *   exponent1         INTEGER,  -- d mod (p1)
 *   exponent2         INTEGER,  -- d mod (q-1)
 *   coefficient       INTEGER,  -- (inverse of q) mod p
 * }
 * @returns {string}  DER Encoded String representing the rsa private key
 * @private
 */
RSAKey.prototype.getPrivateBaseKey = function() {
    //Algorithm version, n, e, d, p, q, dmp1, dmq1, coeff
    //Alg version, modulus, public exponent, private exponent, prime 1, prime 2, exponent 1, exponent 2, coefficient
    var options = {
        'array' : [
            new KJUR.asn1.DERInteger({'int'    : 0}),
            new KJUR.asn1.DERInteger({'bigint' : this.n}),
            new KJUR.asn1.DERInteger({'int'    : this.e}),
            new KJUR.asn1.DERInteger({'bigint' : this.d}),
            new KJUR.asn1.DERInteger({'bigint' : this.p}),
            new KJUR.asn1.DERInteger({'bigint' : this.q}),
            new KJUR.asn1.DERInteger({'bigint' : this.dmp1}),
            new KJUR.asn1.DERInteger({'bigint' : this.dmq1}),
            new KJUR.asn1.DERInteger({'bigint' : this.coeff})
        ]
    };
    var seq = new KJUR.asn1.DERSequence(options);
    return seq.getEncodedHex();
};


////////////////////////////////////////////////////////////////////////////////////


/**
 * Retrieve the pem encoded public key
 * @returns {string} the pem encoded public key with header/footer
 * @public
 */
RSAKey.prototype.getPublicKey = function() {
    var key = "-----BEGIN PUBLIC KEY-----\n";
    key += this.wordwrap(this.getPublicBaseKeyB64()) + "\n";
    key += "-----END PUBLIC KEY-----";
    return key;
};

/**
 * wrap the string in block of width chars. The default value for rsa keys is 64
 * characters.
 * @param {string} str the pem encoded string without header and footer
 * @param {Number} [width=64] - the length the string has to be wrapped at
 * @returns {string} 
 * @private
 */
RSAKey.prototype.wordwrap = function(str, width) {
    width = width || 64;
    if (!str)
        return str;
    var regex = '(.{1,' + width + '})( +|$\n?)|(.{1,' + width + '})';
    return str.match(RegExp(regex, 'g')).join('\n');
};

/**
 * base64 (pem) encoded version of the DER encoded representation
 * @returns {string} pem encoded representation without header and footer
 * @public
 */
RSAKey.prototype.getPublicBaseKeyB64 = function (){
    return hex2b64(this.getPublicBaseKey());
};

/**
 * Translate rsa parameters in a hex encoded string representing the rsa public key.
 * The representation follow the ASN.1 notation :
 * PublicKeyInfo ::= SEQUENCE {
 *   algorithm       AlgorithmIdentifier,
 *   PublicKey       BIT STRING
 * }
 * Where AlgorithmIdentifier is: 
 * AlgorithmIdentifier ::= SEQUENCE {
 *   algorithm       OBJECT IDENTIFIER,     the OID of the enc algorithm
 *   parameters      ANY DEFINED BY algorithm OPTIONAL (NULL for PKCS #1)
 * }
 * and PublicKey is a SEQUENCE encapsulated in a BIT STRING
 * RSAPublicKey ::= SEQUENCE {
 *   modulus           INTEGER,  -- n
 *   publicExponent    INTEGER   -- e
 * }
 * @returns {string} DER Encoded String representing the rsa public key
 * @private
 */
RSAKey.prototype.getPublicBaseKey = function() {
    var options = {
        'array' : [
            new KJUR.asn1.DERObjectIdentifier({'oid':'1.2.840.113549.1.1.1'}), //RSA Encryption pkcs #1 oid
            new KJUR.asn1.DERNull()
        ]
    };
    var first_sequence = new KJUR.asn1.DERSequence(options);
    
    options = {
        'array' : [
            new KJUR.asn1.DERInteger({'bigint' : this.n}),
            new KJUR.asn1.DERInteger({'int' : this.e})
        ]
    };
    var second_sequence = new KJUR.asn1.DERSequence(options);
    
    options = {
        'hex' : '00'+second_sequence.getEncodedHex()
    };
    var bit_string = new KJUR.asn1.DERBitString(options);
    
    options = {
        'array' : [
            first_sequence,
            bit_string
        ]
    };
    var seq = new KJUR.asn1.DERSequence(options);
    return seq.getEncodedHex();
};
