from flask import Flask

from mm_db_cloud.handlers.add import add_handler
from mm_db_cloud.handlers.edit import edit_handler
from mm_db_cloud.handlers.trash import trash_handler
from mm_db_cloud.handlers.restore import restore_handler
from mm_db_cloud.handlers.delete_permanent import delete_permanent_handler
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

    app.add_url_rule("/add", "add", add_handler, methods=["POST"])
    app.add_url_rule("/edit", "edit", edit_handler, methods=["POST"])
    app.add_url_rule("/trash", "trash", trash_handler, methods=["POST"])
    app.add_url_rule("/restore", "restore", restore_handler, methods=["POST"])
    app.add_url_rule(
        "/delete_permanent",
        "delete_permanent",
        delete_permanent_handler,
        methods=["POST"],
    )
    app.register_blueprint(add_museums_bp)
    app.register_blueprint(edit_museums_bp)
    app.register_blueprint(trash_museums_bp)
    app.register_blueprint(restore_museums_bp)
    app.register_blueprint(permanently_delete_museums_bp)

    return app
