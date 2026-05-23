import os
import re
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.platypus.flowables import HRFlowable

try:
    from backend.config import FONTS_DIR, BASE_DIR
except ImportError:
    from config import FONTS_DIR, BASE_DIR

# --- Font Registration ---
DEVANAGARI_REGULAR = os.path.join(FONTS_DIR, "NotoSansDevanagari-Regular.ttf")
DEVANAGARI_BOLD = os.path.join(FONTS_DIR, "NotoSansDevanagari-Bold.ttf")
GUJARATI_REGULAR = os.path.join(FONTS_DIR, "NotoSansGujarati-Regular.ttf")
GUJARATI_BOLD = os.path.join(FONTS_DIR, "NotoSansGujarati-Bold.ttf")

try:
    pdfmetrics.registerFont(TTFont("Devanagari", DEVANAGARI_REGULAR))
    pdfmetrics.registerFont(TTFont("Devanagari-Bold", DEVANAGARI_BOLD))
    pdfmetrics.registerFont(TTFont("Gujarati", GUJARATI_REGULAR))
    pdfmetrics.registerFont(TTFont("Gujarati-Bold", GUJARATI_BOLD))
    
    pdfmetrics.registerFontFamily("Devanagari", normal="Devanagari", bold="Devanagari-Bold")
    pdfmetrics.registerFontFamily("Gujarati", normal="Gujarati", bold="Gujarati-Bold")
except Exception as e:
    print(f"Warning: Fonts could not be registered: {e}")

def process_unicode_tags(text: str, is_bold: bool = False) -> str:
    if not text:
        return ""
    
    text = text.replace("&nbsp;", " ")
    text = text.replace("<strong>", "<b>").replace("</strong>", "</b>")
    
    parts = re.split(r'(<b>|</b>)', text)
    in_bold = is_bold
    
    processed_parts = []
    for part in parts:
        if part == '<b>':
            in_bold = True
            processed_parts.append(part)
        elif part == '</b>':
            in_bold = is_bold
            processed_parts.append(part)
        else:
            font_guj = "Gujarati-Bold" if in_bold else "Gujarati"
            part = re.sub(r'([\u0A80-\u0AFF\u200C\u200D]+)', rf'<font name="{font_guj}">\1</font>', part)
            
            font_dev = "Devanagari-Bold" if in_bold else "Devanagari"
            part = re.sub(r'([\u0900-\u097F\u0964\u0965\u200C\u200D]+)', rf'<font name="{font_dev}">\1</font>', part)
            
            processed_parts.append(part)
            
    return "".join(processed_parts)

def parse_html_to_flowables(html_text: str, style) -> list:
    if not html_text:
        return []
    
    flowables = []
    html_text = html_text.replace("<strong>", "<b>").replace("</strong>", "</b>")
    html_text = html_text.replace("<em>", "<i>").replace("</em>", "</i>")
    
    # Simple regex to check for list items
    items = re.findall(r'<li>(.*?)</li>', html_text, re.DOTALL)
    if items:
        intro_match = re.search(r'^(.*?)(?:<ol>|<ul>)', html_text, re.DOTALL)
        if intro_match:
            intro_text = intro_match.group(1).strip()
            intro_text = re.sub(r'<p>|</p>', '', intro_text)
            if intro_text:
                flowables.append(Paragraph(process_unicode_tags(intro_text), style))
                flowables.append(Spacer(1, 4))
        
        for i, item in enumerate(items, 1):
            item_text = item.strip()
            bullet_text = f"{i}. {item_text}"
            flowables.append(Paragraph(process_unicode_tags(bullet_text), style))
            flowables.append(Spacer(1, 4))
    else:
        paragraphs = re.split(r'</p>|<p>', html_text)
        for p in paragraphs:
            p_text = p.strip()
            if p_text:
                p_text = re.sub(r'<br\s*/?>', '\n', p_text)
                flowables.append(Paragraph(process_unicode_tags(p_text), style))
                flowables.append(Spacer(1, 6))
                
    return flowables

def draw_page_decorations(canvas, doc):
    canvas.saveState()
    # 1. Page Border (1.0 pt thickness) wrapping at margins x=20, y=20
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(1.0)
    canvas.rect(20, 20, 595.27 - 40, 841.89 - 40)
    
    # 2. Page numbering in bottom right margin
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(575.27 - 16, 30, f"Page {doc.page}")
    canvas.restoreState()

def generate_paper_pdf(paper, is_answer_key: bool = False, structure_json: dict = None) -> bytes:
    pdf_buffer = BytesIO()
    
    # Page setup
    # Margins are set to 36pt (leaving 16pt space inside the 20pt border)
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Extracted layout values or defaults
    layout = structure_json or (paper.structure_json if hasattr(paper, 'structure_json') else None) or {}
    font_size_base = layout.get("font_size_base", 11)
    font_size_title = layout.get("font_size_title", 28)
    font_size_subtitle = layout.get("font_size_subtitle", 16)
    font_size_metadata = layout.get("font_size_metadata", 13)
    spacing_questions = layout.get("spacing_questions", 12)
    spacing_sub_questions = layout.get("spacing_sub_questions", 8)
    spacing_sections = layout.get("spacing_sections", 14)
    
    # Base typography (Helvetica to support English, unicode tags for Hindi/Gujarati)
    style_school = ParagraphStyle(
        'SchoolTitle',
        fontName='Helvetica-Bold',
        fontSize=font_size_title,
        leading=font_size_title + 4,
        alignment=1, # Centered
    )
    
    style_title = ParagraphStyle(
        'PaperTitle',
        fontName='Helvetica-Bold',
        fontSize=font_size_subtitle,
        leading=font_size_subtitle + 4,
        alignment=1, # Centered
    )
    
    style_meta = ParagraphStyle(
        'MetadataLeft',
        fontName='Helvetica-Bold',
        fontSize=font_size_metadata,
        leading=font_size_metadata + 4,
        alignment=0, # Left
    )
    
    style_meta_center = ParagraphStyle(
        'MetadataCenter',
        fontName='Helvetica-Bold',
        fontSize=font_size_metadata,
        leading=font_size_metadata + 4,
        alignment=1, # Center
    )
    
    style_meta_right = ParagraphStyle(
        'MetadataRight',
        fontName='Helvetica-Bold',
        fontSize=font_size_metadata,
        leading=font_size_metadata + 4,
        alignment=2, # Right
    )
    
    style_instructions = ParagraphStyle(
        'InstructionsStyle',
        fontName='Helvetica',
        fontSize=font_size_base,
        leading=font_size_base + 4,
    )
    
    style_section = ParagraphStyle(
        'SectionHeaderStyle',
        fontName='Helvetica-Bold',
        fontSize=font_size_base + 1,
        leading=font_size_base + 5,
    )
    
    style_question = ParagraphStyle(
        'QuestionTextStyle',
        fontName='Helvetica',
        fontSize=font_size_base,
        leading=font_size_base + 4,
    )
    
    style_marks = ParagraphStyle(
        'MarksStyle',
        fontName='Helvetica-Bold',
        fontSize=font_size_base,
        leading=font_size_base + 4,
        alignment=2, # Right-aligned
    )
    
    style_opt = ParagraphStyle(
        'MCQOptionStyle',
        fontName='Helvetica',
        fontSize=font_size_base,
        leading=font_size_base + 4,
    )
    
    style_sol = ParagraphStyle(
        'AnswerKeySolStyle',
        fontName='Helvetica',
        fontSize=font_size_base,
        leading=font_size_base + 4,
        textColor=colors.HexColor("#1e3a8a"), # Slate Indigo
    )

    story = []
    
    # 1. School Header & Document Title (Symmetric 3-column layout)
    logo_file = None
    if paper.logo_path:
        cleaned_logo_path = paper.logo_path.lstrip('/')
        # Look in backend folder or absolute path
        paths_to_try = [
            os.path.join(BASE_DIR, cleaned_logo_path),
            os.path.join(BASE_DIR, "uploads", os.path.basename(cleaned_logo_path)),
            os.path.join(os.path.dirname(BASE_DIR), "frontend", "public", cleaned_logo_path),
        ]
        for p in paths_to_try:
            if os.path.exists(p):
                logo_file = p
                break
                
    logo_img = None
    if logo_file:
        try:
            from reportlab.platypus import Image
            logo_img = Image(logo_file, width=60, height=60)
            logo_img.hAlign = 'RIGHT'
        except Exception as img_err:
            print("Error loading logo image:", img_err)
            
    school_para = Paragraph(process_unicode_tags("SHIVASHISH WORLD SCHOOL"), style_school)
    # Append " - ANSWER KEY" if is_answer_key is True
    title_text = f"{paper.title} - ANSWER KEY" if is_answer_key else paper.title
    title_para = Paragraph(process_unicode_tags(title_text), style_title)
    
    # Header columns: empty spacer on left to balance the logo on right
    header_table = Table(
        [
            [Spacer(1, 1), [school_para, Spacer(1, 4), title_para], logo_img if logo_img else Spacer(1, 1)]
        ],
        colWidths=[70, 415.27, 70]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 12))
    
    # 2. Metadata Block (A4 border-to-border layout)
    # Col widths are configured to span full content area 555.27pt
    # Col 1: 100pt, Col 2: 170pt, Col 3: 285.27pt
    meta_date_time = f"DATE: {paper.date_str or ''} &nbsp;&nbsp; TIME: {paper.time_duration or ''} &nbsp;&nbsp; Marks: {paper.max_marks}"
    
    meta_data = [
        [
            Paragraph(process_unicode_tags(f"CLASS: {paper.class_name}"), style_meta),
            Paragraph(process_unicode_tags(f"SUB: {paper.subject}"), style_meta_center),
            Paragraph(process_unicode_tags(meta_date_time), style_meta_right)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[100, 170, 285.27])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (0, 0), 16),    # Col 1 aligns to doc margin
        ('RIGHTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 0),
        ('RIGHTPADDING', (1, 0), (1, 0), 0),
        ('LEFTPADDING', (2, 0), (2, 0), 0),
        ('RIGHTPADDING', (2, 0), (2, 0), 16),   # Col 3 aligns to right doc margin
        ('LINEBELOW', (0, 0), (-1, 0), 2.5, colors.black), # Full width border line
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    
    # 3. Instructions Section
    if paper.instructions:
        inst_flowables = parse_html_to_flowables(paper.instructions, style_instructions)
        story.extend(inst_flowables)
        story.append(Spacer(1, 10))
        
    # 4. Questions Rendering
    questions_list = paper.questions if hasattr(paper, 'questions') else []
    # Sort questions by display_order
    sorted_questions = sorted(questions_list, key=lambda x: x.display_order if x.display_order is not None else 0)
    
    current_section = None
    for q in sorted_questions:
        # Check Section header
        if q.section and q.section.strip() != current_section:
            current_section = q.section.strip()
            story.append(Spacer(1, spacing_sections))
            story.append(Paragraph(process_unicode_tags(f"<b>{current_section}</b>"), style_section))
            story.append(Spacer(1, 6))
            
        # Draw question card
        q_flowables = []
        
        # Parse question text
        question_text_clean = q.question_text or ""
        # Strip outer paragraph tags if any to prevent styling override
        question_text_clean = re.sub(r'^<p>|</p>$', '', question_text_clean)
        
        question_para = Paragraph(process_unicode_tags(question_text_clean), style_question)
        marks_text = f"({q.marks})" if (q.marks is not None and q.marks > 0) else ""
        marks_para = Paragraph(marks_text, style_marks)
        
        # Table aligning question text to left and marks to right margin
        q_header_table = Table(
            [[question_para, marks_para]],
            colWidths=[515.27, 40]
        )
        q_header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        q_flowables.append(q_header_table)
        
        # Display main question solution key if is_answer_key is True
        if is_answer_key and q.answer_text:
            ans_clean = re.sub(r'^<p>|</p>$', '', q.answer_text)
            q_flowables.append(Spacer(1, 4))
            q_flowables.append(Paragraph(process_unicode_tags(f"<b>Sol:</b> {ans_clean}"), style_sol))
            
        # Display sub-questions if present
        sub_questions_list = q.sub_questions if isinstance(q.sub_questions, list) else []
        for idx, sub in enumerate(sub_questions_list, 1):
            sub_flowables = []
            sub_text = sub.get("text", "").strip()
            
            # Check for sequential numbering pattern prefix
            prefix_pattern = r'^(\d+[\.\)]|[a-zA-Z][\.\)]|\([a-zA-Z0-9]\)|[\u0AE6-\u0AEF]+[\.\)])'
            if not re.match(prefix_pattern, sub_text):
                # Automatically prepend sequential sub-question number
                sub_text = f"{idx}. {sub_text}"
                
            sub_para = Paragraph(process_unicode_tags(sub_text), style_question)
            sub_flowables.append(sub_para)
            
            # Render MCQ options if present
            options = sub.get("options", [])
            if options:
                prefixes = ["A. ", "B. ", "C. ", "D. "]
                formatted_opts = []
                for o_idx, opt in enumerate(options):
                    opt_str = str(opt).strip()
                    if not re.match(r'^[A-D]\s*[\.\)]', opt_str):
                        opt_str = prefixes[o_idx] + opt_str
                    formatted_opts.append(opt_str)
                    
                max_len = max(len(o) for o in formatted_opts) if formatted_opts else 0
                sub_flowables.append(Spacer(1, 4))
                if max_len < 15:
                    opt_table = Table([[Paragraph(process_unicode_tags(o), style_opt) for o in formatted_opts]], colWidths=[120]*4)
                elif max_len < 30:
                    opt_table = Table([
                        [Paragraph(process_unicode_tags(formatted_opts[0]), style_opt), Paragraph(process_unicode_tags(formatted_opts[1]), style_opt)],
                        [Paragraph(process_unicode_tags(formatted_opts[2]), style_opt), Paragraph(process_unicode_tags(formatted_opts[3]), style_opt)]
                    ], colWidths=[240, 240])
                else:
                    opt_table = Table([[Paragraph(process_unicode_tags(o), style_opt)] for o in formatted_opts], colWidths=[480])
                
                opt_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                sub_flowables.append(opt_table)
                
            # Render sub-question solution if is_answer_key is True
            if is_answer_key and sub.get("answer"):
                ans_str = str(sub.get("answer")).strip()
                sub_flowables.append(Spacer(1, 4))
                sub_flowables.append(Paragraph(process_unicode_tags(f"<b>Ans:</b> {ans_str}"), style_sol))
                
            # Embed sub-question flowables in a table to indent them and align sub-marks on the right
            sub_marks_text = f"({sub.get('marks')})" if (sub.get("marks") is not None and sub.get("marks") > 0) else ""
            sub_marks_para = Paragraph(sub_marks_text, style_marks)
            
            sub_q_table = Table(
                [[Spacer(1, 1), sub_flowables, sub_marks_para]],
                colWidths=[20, 495.27, 40]
            )
            sub_q_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), spacing_sub_questions),
            ]))
            
            q_flowables.append(Spacer(1, 4))
            q_flowables.append(sub_q_table)
            
        # Draw question flowables in story
        story.extend(q_flowables)
        story.append(Spacer(1, spacing_questions))
        
    doc.build(
        story,
        onFirstPage=draw_page_decorations,
        onLaterPages=draw_page_decorations
    )
    
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()
    return pdf_bytes