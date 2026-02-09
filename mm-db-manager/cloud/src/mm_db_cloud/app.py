from flask import Flask

from mm_db_cloud.handlers.add_museums import bp as add_museums_bp
from mm_db_cloud.handlers.add_museums import bp as add_museums_bp
from mm_db_cloud.handlers.edit_museums import bp as edit_museums_bp
from mm_db_cloud.handlers.trash_museums import bp as trash_museums_bp
from mm_db_cloud.handlers.restore_museums import bp as restore_museums_bp
from mm_db_cloud.handlers.permanently_delete_museums import (
    bp as permanently_delete_museums_bp,
)


def create_app() -> Flask:
    app = Flask(__name__)

    app.register_blueprint(add_museums_bp)
    app.register_blueprint(edit_museums_bp)
    app.register_blueprint(trash_museums_bp)
    app.register_blueprint(restore_museums_bp)
    app.register_blueprint(permanently_delete_museums_bp)

    return app
