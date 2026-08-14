from __future__ import annotations

from pathlib import Path
import shutil

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "tgv-media-personalization-pricing.pdf"
PUBLIC_COPY = ROOT / "public" / "downloads" / OUTPUT.name

ORANGE = colors.HexColor("#B83F00")
BLACK = colors.HexColor("#0F0F10")
SOFT = colors.HexColor("#F1F0F5")
MUTED = colors.HexColor("#62626D")
GRID = colors.HexColor("#D9D8E0")
WHITE = colors.white


def page_header_footer(canvas, doc):
    canvas.saveState()
    width, height = landscape(A4)
    canvas.setFillColor(BLACK)
    canvas.rect(0, height - 17 * mm, width, 17 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 15)
    canvas.drawString(18 * mm, height - 11 * mm, "TGV-Media")
    canvas.setFillColor(ORANGE)
    canvas.circle(48.5 * mm, height - 9.5 * mm, 1.3 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#D7D5DC"))
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 18 * mm, height - 10.5 * mm, "PERSONALISATION PRICE GUIDE · EUR EXCL. VAT")

    canvas.setStrokeColor(GRID)
    canvas.line(18 * mm, 12 * mm, width - 18 * mm, 12 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 7.5 * mm, "Indicative production rates · final quote follows artwork, substrate, and feasibility review")
    canvas.drawRightString(width - 18 * mm, 7.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def table(data, col_widths=None, font_size=7.8, repeat_rows=1):
    result = Table(data, colWidths=col_widths, repeatRows=repeat_rows, hAlign="LEFT")
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLACK),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), font_size),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SOFT]),
                ("GRID", (0, 0), (-1, -1), 0.45, GRID),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return result


styles = getSampleStyleSheet()
TITLE = ParagraphStyle(
    "Title",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=23,
    leading=27,
    textColor=BLACK,
    alignment=TA_LEFT,
    spaceAfter=8,
)
SUBTITLE = ParagraphStyle(
    "Subtitle",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=MUTED,
    spaceAfter=12,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=17,
    textColor=ORANGE,
    spaceBefore=4,
    spaceAfter=7,
)
BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.5,
    leading=12,
    textColor=BLACK,
    spaceAfter=5,
)
NOTE = ParagraphStyle(
    "Note",
    parent=BODY,
    fontSize=7.8,
    leading=10.5,
    textColor=MUTED,
)


def title_block(story, title_text, subtitle_text):
    story.append(Paragraph(title_text, TITLE))
    story.append(Paragraph(subtitle_text, SUBTITLE))


def notes(story, lines):
    story.append(Spacer(1, 4 * mm))
    for line in lines:
        story.append(Paragraph(f"• {line}", NOTE))


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_COPY.parent.mkdir(parents=True, exist_ok=True)

    page_width, page_height = landscape(A4)
    frame = Frame(
        18 * mm,
        16 * mm,
        page_width - 36 * mm,
        page_height - 38 * mm,
        id="main",
        leftPadding=0,
        rightPadding=0,
        topPadding=3 * mm,
        bottomPadding=0,
    )
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A4),
        title="TGV-Media Personalisation Price Guide",
        author="TGV-Media",
        subject="Indicative personalisation production rates in EUR excluding VAT",
    )
    doc.addPageTemplates([PageTemplate(id="rates", frames=[frame], onPage=page_header_footer)])

    story = []

    title_block(
        story,
        "Direct UV printing",
        "Indicative unit rates by production quantity and maximum printed area. Full-colour CMYK plus white is included.",
    )
    uv = [
        ["Quantity", "Small", "Card", "Medium", "Up to A6", "Up to A5", "Up to A4"],
        ["1–20", "min €30", "min €30", "min €30", "min €30", "€2.00", "€4.00"],
        ["21–50", "min €30", "min €30", "€0.80", "€1.20", "€1.87", "€3.75"],
        ["51–100", "min €30", "€0.55", "€0.75", "€1.10", "€1.80", "€3.60"],
        ["101–200", "€0.28", "€0.37", "€0.65", "€0.95", "€1.70", "€3.40"],
        ["201–500", "€0.23", "€0.29", "€0.60", "€0.85", "€1.60", "€3.20"],
        ["501–1,000", "€0.18", "€0.26", "€0.55", "€0.80", "€1.55", "€3.10"],
        ["1,001–2,000", "€0.16", "€0.25", "€0.50", "€0.75", "€1.50", "€3.00"],
        ["2,001+", "€0.15", "€0.22", "€0.40", "€0.70", "€1.30", "€2.80"],
    ]
    story.append(table(uv, [31 * mm] + [34.5 * mm] * 6, 8))
    notes(
        story,
        [
            "Minimum UV order: €30. Protective varnish doubles the production price.",
            "Individual names: +50%. Difficult or irregular shape: +50%.",
            "Unpack/repack: small €0.05, medium €0.10, difficult €0.20 per unit. Production sample: €7.",
            "UV transfer is quoted separately because no validated UV-transfer tariff was supplied.",
        ],
    )
    story.append(PageBreak())

    title_block(
        story,
        "CO2 laser engraving",
        "For paper, leather, textiles, acrylic, wood, cork, glass, coated metal, and selected silicone products.",
    )
    co2 = [
        ["Material / object size", "Under 10", "10–49", "50–199", "200–500", "Over 500"],
        ["Standard · small", "€1.06", "€0.41", "€0.35", "€0.31", "Review"],
        ["Standard · medium", "€1.59", "€0.62", "€0.53", "€0.47", "Review"],
        ["Standard · large", "€2.12", "€0.82", "€0.70", "€0.62", "Review"],
        ["Silicone · small", "€1.64", "€0.62", "€0.53", "€0.47", "Review"],
        ["Silicone · medium", "€2.46", "€0.93", "€0.79", "€0.70", "Review"],
        ["Silicone · large", "—", "—", "—", "—", "Review"],
    ]
    story.append(table(co2, [48 * mm] + [40 * mm] * 5, 8.2))
    notes(
        story,
        [
            "Minimum CO2 laser order: €10. Quantities over 500 units are reviewed for the most efficient production setup.",
            "Luxury objects valued above €40: 2×. Engraved area above 12 cm²: 2×. Individual names: +50%.",
            "Unpack/repack: small €0.05, medium €0.10, difficult €0.20 per unit. Production sample: €7.",
            "Untested surfaces require an additional sample object supplied by the client.",
        ],
    )
    story.append(PageBreak())

    title_block(
        story,
        "Fiber laser engraving",
        "Permanent, high-contrast marking for metals and compatible engineering plastics.",
    )
    fiber = [
        ["Object size", "1–20", "21–100", "101–200", "201–300", "301–500", "501–1,000", "1,001+"],
        ["Small", "€1.00", "€0.60", "€0.45", "€0.30", "€0.23", "€0.17", "€0.15"],
        ["Medium", "€1.50", "€1.00", "€0.75", "€0.45", "€0.38", "€0.30", "€0.28"],
        ["Large", "€1.70", "€1.20", "€0.80", "€0.75", "€0.60", "€0.53", "€0.49"],
    ]
    story.append(table(fiber, [36 * mm] + [31 * mm] * 7, 8.2))
    notes(
        story,
        [
            "Minimum fiber laser order: €10.",
            "Luxury objects valued above €40: 2×. Individual names: +50%.",
            "Unpack/repack: small €0.05, medium €0.10, difficult €0.20 per unit. Production sample: €7.",
        ],
    )
    story.append(PageBreak())

    title_block(
        story,
        "Pad & screen printing · mono-component ink",
        "Indicative unit prices by quantity and number of printed colours.",
    )
    pad_mono_rows = [
        [50, .764, 1.146, 1.526, 1.911, 2.293, 2.675],
        [100, .465, .698, .928, 1.163, 1.395, 1.628],
        [200, .267, .400, .532, .667, .800, .933],
        [300, .223, .334, .445, .557, .668, .780],
        [500, .202, .302, .403, .504, .605, .706],
        [1000, .190, .285, .375, .476, .571, .666],
        [2000, .179, .268, .353, .447, .537, .626],
        [3000, .169, .254, .334, .423, .507, .592],
        [5000, .161, .241, .319, .402, .483, .563],
        [10000, .154, .232, .301, .386, .463, .541],
    ]
    pad_mono = [["Quantity", "1 colour", "2 colours", "3 colours", "4 colours", "5 colours", "6 colours"]]
    pad_mono += [[f"{row[0]:,}"] + [f"€{value:.3f}" for value in row[1:]] for row in pad_mono_rows]
    story.append(table(pad_mono, [31 * mm] + [34.5 * mm] * 6, 7.7))
    notes(story, ["Unpack/repack is added according to object complexity. Final ink system follows substrate testing."])
    story.append(PageBreak())

    title_block(
        story,
        "Pad & screen printing · two-component ink",
        "Indicative unit prices by quantity and number of printed colours.",
    )
    pad_two_rows = [
        [50, 1.226, 1.839, 2.450, 3.065, 3.678, 4.291],
        [100, .745, 1.117, 1.488, 1.862, 2.234, 2.607],
        [200, .426, .639, .852, 1.065, 1.278, 1.491],
        [300, .356, .534, .711, .890, 1.068, 1.246],
        [500, .323, .485, .646, .808, .970, 1.131],
        [1000, .304, .456, .609, .760, .912, 1.064],
        [2000, .286, .429, .571, .715, .859, 1.002],
        [3000, .270, .405, .539, .675, .810, .945],
        [5000, .257, .385, .513, .642, .771, .899],
        [10000, .247, .371, .495, .618, .742, .865],
    ]
    pad_two = [["Quantity", "1 colour", "2 colours", "3 colours", "4 colours", "5 colours", "6 colours"]]
    pad_two += [[f"{row[0]:,}"] + [f"€{value:.3f}" for value in row[1:]] for row in pad_two_rows]
    story.append(table(pad_two, [31 * mm] + [34.5 * mm] * 6, 7.7))
    notes(story, ["Unpack/repack is added according to object complexity. Final ink system follows substrate testing."])
    story.append(PageBreak())

    title_block(
        story,
        "Textile transfer",
        "Indicative unit rates by print area, quantity, and number of colours.",
    )
    story.append(Paragraph("Maximum 20 × 30 cm", H2))
    textile_large = [
        ["Quantity", "1 colour", "2 colours", "3 colours", "4 colours", "5 colours", "6 colours"],
        ["Up to 120", "€0.840", "€1.092", "€1.323", "€1.596", "€1.848", "€2.079"],
        ["121–600", "€0.756", "€0.987", "€1.218", "€1.428", "€1.659", "€1.890"],
        ["601–2,600", "€0.672", "€0.882", "€1.071", "€1.281", "€1.470", "€1.701"],
        ["2,601–5,100", "€0.609", "€0.777", "€0.945", "€1.155", "€1.323", "€1.512"],
        ["5,101–10,500", "€0.525", "€0.672", "€0.861", "€1.008", "€1.155", "€1.323"],
    ]
    story.append(table(textile_large, [34 * mm] + [34 * mm] * 6, 7.4))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("Maximum 10 × 10 cm", H2))
    textile_small = [
        ["Quantity", "1 colour", "2 colours", "3 colours", "4 colours", "5 colours", "6 colours"],
        ["Up to 120", "€0.525", "€0.840", "€1.008", "€1.155", "€1.344", "€1.540"],
        ["121–600", "€0.483", "€0.756", "€0.903", "€1.050", "€1.218", "€1.400"],
        ["601–2,600", "€0.441", "€0.672", "€0.798", "€0.924", "€1.078", "€1.232"],
        ["2,601–5,100", "€0.399", "€0.609", "€0.714", "€0.840", "€0.966", "€1.106"],
        ["5,101–10,500", "€0.347", "€0.546", "€0.672", "€0.777", "€0.882", "€1.022"],
    ]
    story.append(table(textile_small, [34 * mm] + [34 * mm] * 6, 7.4))
    notes(
        story,
        [
            "Orders below 120 units are charged at the 120-unit production minimum.",
            "Handling: textile, bag, or backpack €0.10 per unit; umbrellas €0.20 per unit.",
            "Graphic processing and file preparation: €25/hour when required.",
        ],
    )

    doc.build(story)
    shutil.copy2(OUTPUT, PUBLIC_COPY)
    print(OUTPUT)
    print(PUBLIC_COPY)


if __name__ == "__main__":
    build_pdf()
