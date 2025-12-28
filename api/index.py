import sys
import os

# Wir fügen das Hauptverzeichnis zum Python-Pfad hinzu, 
# damit Python den Ordner "backend" findet.
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Jetzt importieren wir die App aus deinem bestehenden Code
from backend.app.main import app
