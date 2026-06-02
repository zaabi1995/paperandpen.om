#!/usr/bin/env bash
# Render Paper & Pen ERP collateral to PDF with WeasyPrint.
set -euo pipefail
cd "$(dirname "$0")"

echo "Rendering deck.pdf ..."
weasyprint -e utf-8 deck.html deck.pdf

echo "Rendering brochure.pdf ..."
weasyprint -e utf-8 brochure.html brochure.pdf

echo "Rendering bento.pdf ..."
weasyprint -e utf-8 bento.html bento.pdf
cp bento.pdf "$HOME/Downloads/PaperAndPen-ERP-Bento.pdf"

# Copy to Downloads for easy sharing
cp deck.pdf "$HOME/Downloads/PaperAndPen-ERP-Deck.pdf"
cp brochure.pdf "$HOME/Downloads/PaperAndPen-ERP-Brochure.pdf"

echo "Done:"
ls -la deck.pdf brochure.pdf
echo "Copied to ~/Downloads as PaperAndPen-ERP-Deck.pdf and PaperAndPen-ERP-Brochure.pdf"
