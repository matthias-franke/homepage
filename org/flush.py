#!/usr/bin/env python

import time, wsgiref.handlers

class MyApplication(object):
    def __call__(self, environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/html;charset=utf-8')])
        return self.page()

    def page(self):
        yield '<html><body>'
        for i in range(10):
            yield '<div>%i</div>'%i
            time.sleep(1)

    def page2(self):
        yield (
            '<html><body><div id="counter">-</div>'
            '<script type="text/javascript">'
            '    function update(n) {'
            '        document.getElementById("counter").firstChild.data= n;'
            '    }'
            '</script>'
        )
        for i in range(10):
            yield '<script type="text/javascript">update(%i);</script>'%i
            time.sleep(1)

application= MyApplication()
if __name__=='__main__':
    wsgiref.handlers.CGIHandler().run(application)