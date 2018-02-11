#!/mnt/web108/b3/29/5385729/htdocs/_python/bin/python
#!/usr/bin/env python
#!"C:\Program Files\WinPython-32bit-2.7.5.3\python-2.7.5\python.exe"

import js2py
# does not work:
# execjs (PyExecJS)
# (PyV8)

print ("Content-Type: text/html\n")


js = """
function escramble_758(){
var a,b,c;
a='+1 ';
b='84-';
a+='425-';
b+='7450';
c='9';
document.write(a+c+b);
}
escramble_758()
""".replace("document.write", "return ")

message = js2py.eval_js(js) 


message2 = "hi mfr 2"
             
print message
    
