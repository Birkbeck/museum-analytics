from flask import Flask, jsonify

from mm_db_cloud.handlers.add_museums import bp as add_museums_bp
from mm_db_cloud.handlers.edit_museums import bp as edit_museums_bp
from mm_db_cloud.handlers.trash_museums import bp as trash_museums_bp
from mm_db_cloud.handlers.restore_museums import bp as restore_museums_bp
from mm_db_cloud.handlers.permanently_delete_museums import (
    bp as permanently_delete_museums_bp,
)
from mm_db_cloud.models.errors import AuthError, RequestValidationError


def create_app() -> Flask:
    app = Flask(__name__)

    # --- Blueprints ---
    app.register_blueprint(add_museums_bp)
    app.register_blueprint(edit_museums_bp)
    app.register_blueprint(trash_museums_bp)
    app.register_blueprint(restore_museums_bp)
    app.register_blueprint(permanently_delete_museums_bp)

    # --- Error handlers (JSON everywhere) ---
    @app.errorhandler(AuthError)
    def handle_auth_error(e: AuthError):
        return jsonify({"ok": False, "error": str(e)}), 403

    @app.errorhandler(RequestValidationError)
    def handle_validation_error(e: RequestValidationError):
        return jsonify({"ok": False, "error": str(e)}), 400

    @app.errorhandler(Exception)
    def handle_unexpected_error(e: Exception):
        # You may want to log e here
        return jsonify({"ok": False, "error": "Internal server error"}), 500

    return app
