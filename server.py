import web
import io
import string
import os.path
import json

from pyngrok import ngrok

# routing
urls = (
    '/?', 'main',
    '/css/(.*)', 'css',
    '/js/(.*)', 'js',
    '/units/?', 'units',
    '/units/change', 'unitchanges',
    '/walls', 'walls'
)
app = web.application(urls, globals())
render = web.template.render('templates/', base='base')
web.config.debug = False

storage = {}
storage['id'] = 0

# ngrok
try:
    tcp_tunnel = ngrok.connect(8080)
    storage['ngrok'] = tcp_tunnel.public_url
except:
    storage['ngrok'] = 'offline, server is local only'

# region cookies


def set_cookie(name, value, create_new=True):
    if not create_new:
        try:
            web.cookies()[name]
            return False
        except:
            pass

    web.setcookie(name, value)
    return True


def clear_cookie(name):
    web.setcookie(name, 0, -1)
# endregion


class main:
    def GET(self):
        current_id = storage['id']
        s = set_cookie('id', current_id, False)
        if s:
            storage['id'] = current_id + 1

        try:  # allow manually clearing cookies
            if web.input().cookieclear == '1':
                clear_cookie('id')
        except:
            pass

        return render.index(storage)


# region battlemap handling
class unit:
    def __init__(self, uid, size, x, y, name):
        self.id = uid
        self.size = size
        self.x = x
        self.y = y
        self.name = name


UNIT_MOVE = 0
UNIT_NEW = 1
UNIT_REMOVE = 2


class change:
    def __init__(self, change_type, uid, x, y):
        self.type = change_type
        if change_type == UNIT_MOVE:
            self.id = uid
            self.x = x
            self.y = y


storage['units'] = {}
storage['units'][0] = unit(0, 1, 1, 1, 'charlie')
storage['units'][1] = unit(1, 3, 4, 1, "charlie's horse")


class units:
    def GET(self):
        return json.dumps([unit.__dict__ for unit in storage['units'].values()])

class unitchanges:
    def POST(self):
        data = json.loads(web.data())

        for c in data:
            if c['type'] == UNIT_MOVE:
                storage['units'][c['id']].x = c['x']
                storage['units'][c['id']].y = c['y']
            if c['type'] == UNIT_NEW:
                storage['units'][c['id']] = unit(c['id'], c['size'], c['x'], c['y'], c['name'])

# endregion


# region files


class css:
    def GET(self, name):
        path='css/'+name
        if not os.path.exists(path):
            return web.notfound()
        return open(path).read()


class js:
    def GET(self, name):
        path='js/'+name
        if not os.path.exists(path):
            return web.notfound()
        return open(path).read()
# endregion


if __name__ == "__main__":
    app.run()
