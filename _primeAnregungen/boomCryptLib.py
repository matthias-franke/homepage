# -*- coding: utf-8 -*-
"""
Created on Wed Dec 11 09:07:37 2013

@author: cb3fias
"""
import boomCryptConvLib, boomCryptPemLib, boomCryptPrimLib

try:
    # < Python3
    unicode_type = unicode
    have_python3 = False
except NameError:
    # Python3.
    unicode_type = str
    have_python3 = True
    
    
def newkeys(nbits, accurate=True, poolsize=1):
    '''Generates public and private keys, and returns them as (pub, priv).

    The public key is also known as the 'encryption key', and is a
    :py:class:`rsa.PublicKey` object. The private key is also known as the
    'decryption key' and is a :py:class:`rsa.PrivateKey` object.

    :param nbits: the number of bits required to store ``n = p*q``.
    :param accurate: when True, ``n`` will have exactly the number of bits you
        asked for. However, this makes key generation much slower. When False,
        `n`` may have slightly less bits.
    :param poolsize: the number of processes to use to generate the prime
        numbers. If set to a number > 1, a parallel algorithm will be used.
        This requires Python 2.6 or newer.

    :returns: a tuple (:py:class:`rsa.PublicKey`, :py:class:`rsa.PrivateKey`)

    The ``poolsize`` parameter was added in *Python-RSA 3.1* and requires
    Python 2.6 or newer.
    
    '''

    if nbits < 16:
        raise ValueError('Key too small')

    if poolsize < 1:
        raise ValueError('Pool size (%i) should be >= 1' % poolsize)
#TODO was ist parallel?
    # Determine which getprime function to use
# if poolsize > 1:
#        from rsa import parallel
#        import functools

#        getprime_func = functools.partial(parallel.getprime, poolsize=poolsize)
#    else: getprime_func = rsa.prime.getprime

    # Generate the key components
    (p, q, e, d) = gen_keys(nbits, boomCryptPrimLib.getprime)
    
    # Create the key objects
    n = p * q

    return (
        boomCryptPemLib.PublicKey(n, e),
        boomCryptPemLib.PrivateKey(n, e, d, p, q)
    )    
    
def gen_keys(nbits, getprime_func, accurate=True):
    '''Generate RSA keys of nbits bits. Returns (p, q, e, d).

    Note: this can take a long time, depending on the key size.
    
    :param nbits: the total number of bits in ``p`` and ``q``. Both ``p`` and
        ``q`` will use ``nbits/2`` bits.
    :param getprime_func: either :py:func:`rsa.prime.getprime` or a function
        with similar signature.
    '''

    (p, q) = find_p_q(nbits // 2, getprime_func, accurate)
    (e, d) = calculate_keys(p, q, nbits // 2)

    return (p, q, e, d)

#def find_p_q(nbits, getprime_func=boomCryptPrimLib.getprime, accurate=True):
def find_p_q(nbits, getprime_func, accurate=True):
    ''''Returns a tuple of two different primes of nbits bits each.
    
    The resulting p * q has exacty 2 * nbits bits, and the returned p and q
    will not be equal.

    :param nbits: the number of bits in each of p and q.
    :param getprime_func: the getprime function, defaults to
        :py:func:`rsa.prime.getprime`.

        *Introduced in Python-RSA 3.1*

    :param accurate: whether to enable accurate mode or not.
    :returns: (p, q), where p > q

    >>> (p, q) = find_p_q(128)
    >>> from rsa import common
    >>> common.bit_size(p * q)
    256

    When not in accurate mode, the number of bits can be slightly less

    >>> (p, q) = find_p_q(128, accurate=False)
    >>> from rsa import common
    >>> common.bit_size(p * q) <= 256
    True
    >>> common.bit_size(p * q) > 240
    True
    
    '''
    
    total_bits = nbits * 2

    # Make sure that p and q aren't too close or the factoring programs can
    # factor n.
    shift = nbits // 16
    pbits = nbits + shift
    qbits = nbits - shift
    
    # Choose the two initial primes
    #log.debug('find_p_q(%i): Finding p', nbits)
    p = getprime_func(pbits)
    #log.debug('find_p_q(%i): Finding q', nbits)
    q = getprime_func(qbits)

    def is_acceptable(p, q):
        '''Returns True iff p and q are acceptable:
            
            - p and q differ
            - (p * q) has the right nr of bits (when accurate=True)
        '''

        if p == q:
            return False

        if not accurate:
            return True

        # Make sure we have just the right amount of bits
        found_size = boomCryptConvLib.bit_size(p * q)
        return total_bits == found_size

    # Keep choosing other primes until they match our requirements.
    change_p = False
    while not is_acceptable(p, q):
        # Change p on one iteration and q on the other
        if change_p:
            p = getprime_func(pbits)
        else:
            q = getprime_func(qbits)

        change_p = not change_p

    # We want p > q as described on
    # http://www.di-mgt.com.au/rsa_alg.html#crt
    return (max(p, q), min(p, q))





def calculate_keys(p, q, nbits):
    '''Calculates an encryption and a decryption key given p and q, and
    returns them as a tuple (e, d)

    '''

    phi_n = (p - 1) * (q - 1)

    # A very common choice for e is 65537
    e = 65537

    try:
        d = inverse(e, phi_n)
    except ValueError:
        raise ValueError("e (%d) and phi_n (%d) are not relatively prime" %
                (e, phi_n))

    if (e * d) % phi_n != 1:
        raise ValueError("e (%d) and d (%d) are not mult. inv. modulo "
                "phi_n (%d)" % (e, d, phi_n))

    return (e, d)
    
    
def inverse(x, n):
    '''Returns x^-1 (mod n)

    >>> inverse(7, 4)
    3
    >>> (inverse(143, 4) * 143) % 4
    1
    '''

    (divider, inv, _) = extended_gcd(x, n)

    if divider != 1:
        raise ValueError("x (%d) and n (%d) are not relatively prime" % (x, n))

    return inv   
    
    
def extended_gcd(a, b):
    '''Returns a tuple (r, i, j) such that r = gcd(a, b) = ia + jb
    '''
    # r = gcd(a,b) i = multiplicitive inverse of a mod b
    #      or      j = multiplicitive inverse of b mod a
    # Neg return values for i or j are made positive mod b or a respectively
    # Iterateive Version is faster and uses much less stack space
    x = 0
    y = 1
    lx = 1
    ly = 0
    oa = a                             #Remember original a/b to remove 
    ob = b                             #negative values from return results
    while b != 0:
        q = a // b
        (a, b)  = (b, a % b)
        (x, lx) = ((lx - (q * x)),x)
        (y, ly) = ((ly - (q * y)),y)
    if (lx < 0): lx += ob              #If neg wrap modulo orignal b
    if (ly < 0): ly += oa              #If neg wrap modulo orignal a
    return (a, lx, ly)                 #Return only positive values

