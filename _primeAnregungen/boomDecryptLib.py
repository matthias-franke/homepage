# -*- coding: utf-8 -*-
"""
Created on Thu Dec 12 11:26:16 2013

@author: cb3fias
"""

import os, boomCryptConvLib

def encrypt(message, pub_key):
    '''Encrypts the given message using PKCS#1 v1.5
    
    :param message: the message to encrypt. Must be a byte string no longer than
        ``k-11`` bytes, where ``k`` is the number of bytes needed to encode
        the ``n`` component of the public key.
    :param pub_key: the :py:class:`rsa.PublicKey` to encrypt with.
    :raise OverflowError: when the message is too large to fit in the padded
        block.
        
    >>> from rsa import key, common
    >>> (pub_key, priv_key) = key.newkeys(256)
    >>> message = 'hello'
    >>> crypto = encrypt(message, pub_key)
    
    The crypto text should be just as long as the public key 'n' component:

    >>> len(crypto) == common.byte_size(pub_key.n)
    True
    
    '''
    
    keylength = byte_size(pub_key.n)
    padded = _pad_for_encryption(message, keylength)
    
    payload = boomCryptConvLib.bytes2int(padded)
    encrypted = encrypt_int(payload, pub_key.e, pub_key.n)
    block = boomCryptConvLib.int2bytes(encrypted, keylength)
    
    return block

def sign(message, priv_key):
    
    keylength = byte_size(priv_key.n)
    padded = _pad_for_encryption(message, keylength)
    
    payload = boomCryptConvLib.bytes2int(padded)
    encrypted = encrypt_int(payload, priv_key.d, priv_key.n)
    block = boomCryptConvLib.int2bytes(encrypted, keylength)
    
    return block

def verify(signature, pub_key):
    '''Verifies that the signature matches the message.
    
    The hash method is detected automatically from the signature.
    
    :param message: the signed message. Can be an 8-bit string or a file-like
        object. If ``message`` has a ``read()`` method, it is assumed to be a
        file-like object.
    :param signature: the signature block, as created with :py:func:`rsa.sign`.
    :param pub_key: the :py:class:`rsa.PublicKey` of the person signing the message.
    :raise VerificationError: when the signature doesn't match the message.

    .. warning::

        Never display the stack trace of a
        :py:class:`rsa.pkcs1.VerificationError` exception. It shows where in
        the code the exception occurred, and thus leaks information about the
        key. It's only a tiny bit of information, but every bit makes cracking
        the keys easier.

    '''

    blocksize = byte_size(pub_key.n)
    encrypted = boomCryptConvLib.bytes2int(signature)
    decrypted = decrypt_int(encrypted, pub_key.e, pub_key.n)
    clearsig = boomCryptConvLib.int2bytes(decrypted, blocksize)
   
    # Find the 00 separator between the padding and the payload
    try:
        sep_idx = clearsig.index(boomCryptConvLib.b('\x00'), 2)
    except ValueError:
        raise DecryptionError('Verification failed')
    
    return clearsig[sep_idx+1:]

def verify2(signature, pub_key):
    '''Verifies that the signature matches the message.
    
    The hash method is detected automatically from the signature.
    
    :param message: the signed message. Can be an 8-bit string or a file-like
        object. If ``message`` has a ``read()`` method, it is assumed to be a
        file-like object.
    :param signature: the signature block, as created with :py:func:`rsa.sign`.
    :param pub_key: the :py:class:`rsa.PublicKey` of the person signing the message.
    :raise VerificationError: when the signature doesn't match the message.

    .. warning::

        Never display the stack trace of a
        :py:class:`rsa.pkcs1.VerificationError` exception. It shows where in
        the code the exception occurred, and thus leaks information about the
        key. It's only a tiny bit of information, but every bit makes cracking
        the keys easier.

    '''

    blocksize = byte_size(pub_key.n)
    encrypted = int(signature, 16) #boomCryptConvLib.bytes2int(signature)
    decrypted = decrypt_int(encrypted, pub_key.e, pub_key.n)
    
    cleartext = boomCryptConvLib.int2bytes(decrypted, blocksize)

    # If we can't find the cleartext marker, decryption failed.
    if cleartext[0:2] != boomCryptConvLib.b('\x00\x02'):
        raise DecryptionError('Decryption failed 1')
    
    # Find the 00 separator between the padding and the message
    try:
        sep_idx = cleartext.index(boomCryptConvLib.b('\x00'), 2)
    except ValueError:
        raise DecryptionError('Decryption failed 2')
    
    return cleartext[sep_idx+1:]    
    
    
    
    
    
def decrypt(crypto, priv_key):
    r'''Decrypts the given message using PKCS#1 v1.5
    
    The decryption is considered 'failed' when the resulting cleartext doesn't
    start with the bytes 00 02, or when the 00 byte between the padding and
    the message cannot be found.
    
    :param crypto: the crypto text as returned by :py:func:`rsa.encrypt`
    :param priv_key: the :py:class:`rsa.PrivateKey` to decrypt with.
    :raise DecryptionError: when the decryption fails. No details are given as
        to why the code thinks the decryption fails, as this would leak
        information about the private key.


    >>> import rsa
    >>> (pub_key, priv_key) = rsa.newkeys(256)

    It works with strings:

    >>> crypto = encrypt('hello', pub_key)
    >>> decrypt(crypto, priv_key)
    'hello'
    
    And with binary data:

    >>> crypto = encrypt('\x00\x00\x00\x00\x01', pub_key)
    >>> decrypt(crypto, priv_key)
    '\x00\x00\x00\x00\x01'

    Altering the encrypted information will *likely* cause a
    :py:class:`rsa.pkcs1.DecryptionError`. If you want to be *sure*, use
    :py:func:`rsa.sign`.


    .. warning::

        Never display the stack trace of a
        :py:class:`rsa.pkcs1.DecryptionError` exception. It shows where in the
        code the exception occurred, and thus leaks information about the key.
        It's only a tiny bit of information, but every bit makes cracking the
        keys easier.

    >>> crypto = encrypt('hello', pub_key)
    >>> crypto = crypto[0:5] + 'X' + crypto[6:] # change a byte
    >>> decrypt(crypto, priv_key)
    Traceback (most recent call last):
    ...
    DecryptionError: Decryption failed

    '''
    
    blocksize = byte_size(priv_key.n)
    encrypted = boomCryptConvLib.bytes2int(crypto)
    decrypted = decrypt_int(encrypted, priv_key.d, priv_key.n)
    cleartext = boomCryptConvLib.int2bytes(decrypted, blocksize)

    # If we can't find the cleartext marker, decryption failed.
    if cleartext[0:2] != boomCryptConvLib.b('\x00\x02'):
        raise DecryptionError('Decryption failed 1')
    
    # Find the 00 separator between the padding and the message
    try:
        sep_idx = cleartext.index(boomCryptConvLib.b('\x00'), 2)
    except ValueError:
        raise DecryptionError('Decryption failed 2')
    
    return cleartext[sep_idx+1:]




def byte_size(number):
    '''
    Returns the number of bytes required to hold a specific long number.
    
    The number of bytes is rounded up.

    Usage::

        >>> byte_size(1 << 1023)
        128
        >>> byte_size((1 << 1024) - 1)
        128
        >>> byte_size(1 << 1024)
        129

    :param number:
        An unsigned integer
    :returns:
        The number of bytes required to hold a specific long number.
    '''
    quanta, mod = divmod(boomCryptConvLib.bit_size(number), 8)
    if mod or number == 0:
        quanta += 1
    return quanta
    #return int(math.ceil(bit_size(number) / 8.0))

def encrypt_int(message, ekey, n):
    '''Encrypts a message using encryption key 'ekey', working modulo n'''

    assert_int(message, 'message')
    assert_int(ekey, 'ekey')
    assert_int(n, 'n')

    if message < 0:
        raise ValueError('Only non-negative numbers are supported')
         
    if message > n:
        raise OverflowError("The message %i is too long for n=%i" % (message, n))

    return pow(message, ekey, n)

def decrypt_int(cyphertext, dkey, n):
    '''Decrypts a cypher text using the decryption key 'dkey', working
    modulo n'''

    assert_int(cyphertext, 'cyphertext')
    assert_int(dkey, 'dkey')
    assert_int(n, 'n')

    message = pow(cyphertext, dkey, n)
    return message
    
def assert_int(var, name):

    if is_integer(var):
        return

    raise TypeError('%s should be an integer, not %s' % (name, var.__class__))    
    
class CryptoError(Exception):
    '''Base class for all exceptions in this module.'''
    
class DecryptionError(CryptoError):
    '''Raised when decryption fails.'''   
    
    
def _pad_for_encryption(message, target_length):
    r'''Pads the message for encryption, returning the padded message.
    
    :return: 00 02 RANDOM_DATA 00 MESSAGE
    
    >>> block = _pad_for_encryption('hello', 16)
    >>> len(block)
    16
    >>> block[0:2]
    '\x00\x02'
    >>> block[-6:]
    '\x00hello'

    '''

    max_msglength = target_length - 11
    msglength = len(message)
    
    if msglength > max_msglength:
        raise OverflowError('%i bytes needed for message, but there is only'
            ' space for %i' % (msglength, max_msglength))
    
    # Get random padding
    padding = boomCryptConvLib.b('')
    padding_length = target_length - msglength - 3
    
    # We remove 0-bytes, so we'll end up with less padding than we've asked for,
    # so keep adding data until we're at the correct length.
    while len(padding) < padding_length:
        needed_bytes = padding_length - len(padding)
        
        # Always read at least 8 bytes more than we need, and trim off the rest
        # after removing the 0-bytes. This increases the chance of getting
        # enough bytes, especially when needed_bytes is small
        new_padding = os.urandom(needed_bytes + 5)
        new_padding = new_padding.replace(boomCryptConvLib.b('\x00'), boomCryptConvLib.b(''))
        padding = padding + new_padding[:needed_bytes]
    
    assert len(padding) == padding_length
    
    return boomCryptConvLib.b('').join([boomCryptConvLib.b('\x00\x02'),
                    padding,
                    boomCryptConvLib.b('\x00'),
                    message])    
                    
# ``long`` is no more. Do type detection using this instead.
try:
    integer_types = (int, long)
except NameError:
    integer_types = (int,)
                    
def is_integer(obj):
    """
    Determines whether the given value is an integer.

    :param obj:
        The value to test.
    :returns:
        ``True`` if ``value`` is an integer; ``False`` otherwise.
    """
    return isinstance(obj, integer_types)                    