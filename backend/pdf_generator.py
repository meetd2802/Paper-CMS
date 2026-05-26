import os
import re
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Frame, PageTemplate
from reportlab.platypus.doctemplate import _doNothing, BaseDocTemplate
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.platypus.flowables import HRFlowable

class ZeroPaddingDocTemplate(SimpleDocTemplate):
    def build(self, flowables, onFirstPage=_doNothing, onLaterPages=_doNothing, canvasmaker=canvas.Canvas):
        self._calc()
        frameT = Frame(
            self.leftMargin, 
            self.bottomMargin, 
            self.width, 
            self.height, 
            id='normal',
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0
        )
        self.addPageTemplates([
            PageTemplate(id='First', frames=frameT, onPage=onFirstPage, pagesize=self.pagesize),
            PageTemplate(id='Later', frames=frameT, onPage=onLaterPages, pagesize=self.pagesize)
        ])
        if onFirstPage is _doNothing and hasattr(self, 'onFirstPage'):
            self.pageTemplates[0].beforeDrawPage = self.onFirstPage
        if onLaterPages is _doNothing and hasattr(self, 'onLaterPages'):
            self.pageTemplates[1].beforeDrawPage = self.onLaterPages
        BaseDocTemplate.build(self, flowables, canvasmaker=canvasmaker)

try:
    from backend.config import FONTS_DIR, BASE_DIR
except ImportError:
    from config import FONTS_DIR, BASE_DIR

# --- Font Registration ---
DEVANAGARI_REGULAR = os.path.join(FONTS_DIR, "NotoSansDevanagari-Regular.ttf")
DEVANAGARI_BOLD = os.path.join(FONTS_DIR, "NotoSansDevanagari-Bold.ttf")
GUJARATI_REGULAR = os.path.join(FONTS_DIR, "NotoSansGujarati-Regular.ttf")
GUJARATI_BOLD = os.path.join(FONTS_DIR, "NotoSansGujarati-Bold.ttf")
NOTOSANS_REGULAR = os.path.join(FONTS_DIR, "NotoSans-Regular.ttf")
NOTOSANS_BOLD = os.path.join(FONTS_DIR, "NotoSans-Bold.ttf")

BASE_FONT = "Times-Roman"
BASE_FONT_BOLD = "Times-Bold"

try:
    pdfmetrics.registerFont(TTFont("Devanagari", DEVANAGARI_REGULAR))
    pdfmetrics.registerFont(TTFont("Devanagari-Bold", DEVANAGARI_BOLD))
    pdfmetrics.registerFont(TTFont("Gujarati", GUJARATI_REGULAR))
    pdfmetrics.registerFont(TTFont("Gujarati-Bold", GUJARATI_BOLD))
    
    pdfmetrics.registerFontFamily("Devanagari", normal="Devanagari", bold="Devanagari-Bold")
    pdfmetrics.registerFontFamily("Gujarati", normal="Gujarati", bold="Gujarati-Bold")

    if os.path.exists(NOTOSANS_REGULAR) and os.path.exists(NOTOSANS_BOLD):
        pdfmetrics.registerFont(TTFont("NotoSans", NOTOSANS_REGULAR))
        pdfmetrics.registerFont(TTFont("NotoSans-Bold", NOTOSANS_BOLD))
        pdfmetrics.registerFontFamily("NotoSans", normal="NotoSans", bold="NotoSans-Bold")
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
            font_ns = "NotoSans-Bold" if in_bold else "NotoSans"
            # Wrap math symbols, Greek, fractions, superscripts in NotoSans
            part = re.sub(
                r'([\u2200-\u22FF\u0370-\u03FF\u2070-\u209F\u2150-\u218F\u25A0-\u25FF\u27C0-\u27EF\u2980-\u29FF]+)',
                rf'<font name="{font_ns}">\1</font>',
                part
            )
            
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
    
    # We can split the HTML text by list blocks: <ol>...</ol> and <ul>...</ul>
    # This preserves paragraphs before/after/between lists.
    parts = re.split(r'(<ol>.*?</ol>|<ul>.*?</ul>)', html_text, flags=re.DOTALL)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        if part.startswith("<ol>"):
            items = re.findall(r'<li>(.*?)</li>', part, re.DOTALL)
            for i, item in enumerate(items, 1):
                item_text = item.strip()
                item_text = re.sub(r'<p>|</p>', '', item_text)
                bullet_text = f"{i}. {item_text}"
                flowables.append(Paragraph(process_unicode_tags(bullet_text), style))
                flowables.append(Spacer(1, 4))
        elif part.startswith("<ul>"):
            items = re.findall(r'<li>(.*?)</li>', part, re.DOTALL)
            for item in items:
                item_text = item.strip()
                item_text = re.sub(r'<p>|</p>', '', item_text)
                # Use bullet symbol • (entity &bull;)
                bullet_text = f"&bull; {item_text}"
                flowables.append(Paragraph(process_unicode_tags(bullet_text), style))
                flowables.append(Spacer(1, 4))
        else:
            # Paragraphs
            paragraphs = re.split(r'</p>|<p>', part)
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
    
    # Print the active frame coordinates for debugging
    try:
        frame_log = f"ACTIVE TEMPLATE FRAME: x1={doc.pageTemplate.frames[0]._x1} width={doc.pageTemplate.frames[0]._width}\n"
        with open('/Users/meet/.gemini/antigravity/brain/6ab47fb8-ccea-40dd-adb0-87dead90115e/scratch/margins.txt', 'a') as debug_f:
            debug_f.write(frame_log)
        print("ACTIVE TEMPLATE FRAME: x1 =", doc.pageTemplate.frames[0]._x1, "width =", doc.pageTemplate.frames[0]._width)
    except Exception as e:
        print("Frame inspect error:", e)
        
    # 2. Page numbering in bottom right margin
    canvas.setFont("Times-Roman", 9)
    canvas.drawRightString(559.27, 30, f"Page {doc.page}")
    canvas.restoreState()

def generate_paper_pdf(paper, is_answer_key: bool = False, structure_json: dict = None) -> bytes:
    pdf_buffer = BytesIO()
    
    # Page setup
    # Margins are set to 36pt (leaving 16pt space inside the 20pt border)
    doc = ZeroPaddingDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    with open('/Users/meet/.gemini/antigravity/brain/6ab47fb8-ccea-40dd-adb0-87dead90115e/scratch/margins.txt', 'a') as debug_f:
        debug_f.write(f"CALL MARGINS: left={doc.leftMargin} right={doc.rightMargin} width={doc.width}\n")
    print("DEBUG MARGINS: left =", doc.leftMargin, "right =", doc.rightMargin, "width =", doc.width)
    
    styles = getSampleStyleSheet()
    
    # Extracted layout values or defaults
    layout = structure_json or (paper.structure_json if hasattr(paper, 'structure_json') else None) or {}
    font_size_base = layout.get("font_size_base", 11)
    font_size_title = layout.get("font_size_title", 22)
    font_size_subtitle = layout.get("font_size_subtitle", 14)
    font_size_metadata = layout.get("font_size_metadata", 12)
    spacing_questions = layout.get("spacing_questions", 12)
    spacing_sub_questions = layout.get("spacing_sub_questions", 8)
    spacing_sections = layout.get("spacing_sections", 14)
    
    # Base typography (NotoSans/Helvetica to support English, unicode tags for Hindi/Gujarati)
    style_school = ParagraphStyle(
        'SchoolTitle',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_title,
        leading=font_size_title + 4,
        alignment=1, # Centered
    )
    
    style_title = ParagraphStyle(
        'PaperTitle',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_subtitle,
        leading=font_size_subtitle + 4,
        alignment=1, # Centered
    )
    
    style_meta = ParagraphStyle(
        'MetadataLeft',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_metadata,
        leading=font_size_metadata + 4,
        alignment=0, # Left
    )
    
    style_meta_center = ParagraphStyle(
        'MetadataCenter',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_metadata,
        leading=font_size_metadata + 4,
        alignment=1, # Center
    )
    
    style_meta_right = ParagraphStyle(
        'MetadataRight',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_metadata,
        leading=font_size_metadata + 4,
        alignment=2, # Right
    )
    
    style_instructions = ParagraphStyle(
        'InstructionsStyle',
        fontName=BASE_FONT,
        fontSize=font_size_base,
        leading=font_size_base + 4,
    )
    
    style_section = ParagraphStyle(
        'SectionHeaderStyle',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_base + 1,
        leading=font_size_base + 5,
    )
    
    style_question = ParagraphStyle(
        'QuestionTextStyle',
        fontName=BASE_FONT,
        fontSize=font_size_base,
        leading=font_size_base + 4,
    )
    
    style_marks = ParagraphStyle(
        'MarksStyle',
        fontName=BASE_FONT_BOLD,
        fontSize=font_size_base,
        leading=font_size_base + 4,
        alignment=2, # Right-aligned
    )
    
    style_opt = ParagraphStyle(
        'MCQOptionStyle',
        fontName=BASE_FONT,
        fontSize=font_size_base,
        leading=font_size_base + 4,
        leftIndent=15,
    )
    
    style_sol = ParagraphStyle(
        'AnswerKeySolStyle',
        fontName=BASE_FONT,
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
            logo_img = Image(logo_file, width=65, height=65)
            logo_img.hAlign = 'RIGHT'
        except Exception as img_err:
            print("Error loading logo image:", img_err)
            
    school_para = Paragraph(process_unicode_tags("SHIVASHISH WORLD SCHOOL"), style_school)
    # Append " - ANSWER KEY" if is_answer_key is True
    title_text = f"{paper.title} - ANSWER KEY" if is_answer_key else paper.title
    title_para = Paragraph(process_unicode_tags(title_text), style_title)
    
    # 3-column layout to center titles perfectly while keeping the logo on the far right
    # colWidths sum to 523.27pt (A4 width 595.27 - 72pt margins)
    header_table = Table(
        [
            [Spacer(1, 1), [school_para, Spacer(1, 4), title_para], logo_img if logo_img else Spacer(1, 1)]
        ],
        colWidths=[65, 393.27, 65]
    )
    header_table.hAlign = 'LEFT'
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))
    
    # 2. Metadata Block (A4 border-to-border layout)
    # Row 1: CLASS : <class> (left), SUB : <subject> (center), DATE : <date> (right)
    # Row 2: TIME : <time> (left), MM : <marks> (right)
    # Col widths sum to 523.27pt: [150, 223.27, 150]
    meta_data = [
        [
            Paragraph(process_unicode_tags(f"CLASS : {paper.class_name}"), style_meta),
            Paragraph(process_unicode_tags(f"SUB : {paper.subject}"), style_meta_center),
            Paragraph(process_unicode_tags(f"DATE : {paper.date_str or ''}"), style_meta)
        ],
        [
            Paragraph(process_unicode_tags(f"TIME : {paper.time_duration or ''}"), style_meta),
            Spacer(1, 1),
            Paragraph(process_unicode_tags(f"MM : {paper.max_marks}"), style_meta)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[150, 223.27, 150])
    meta_table.hAlign = 'LEFT'
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 1), (-1, 1), 1.2, colors.black), # Thin clean border line below the metadata block
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
    q_counter = 1
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
        
        # Prepend Q{q_counter}. if it doesn't already start with Q{number}
        text_without_tags = re.sub(r'<[^>]*>', '', question_text_clean).strip()
        if not re.match(r'^Q\d+\s*[\.\)]', text_without_tags):
            if question_text_clean.startswith("<p>"):
                question_text_clean = f"<p>Q{q_counter}. " + question_text_clean[3:]
            else:
                question_text_clean = f"Q{q_counter}. " + question_text_clean
                
        question_flowables = parse_html_to_flowables(question_text_clean, style_question)
        if not question_flowables:
            question_flowables = [Paragraph(f"Q{q_counter}. ", style_question)]
            
        q_counter += 1
            
        marks_text = f"({q.marks})" if (q.marks is not None and q.marks > 0) else ""
        marks_para = Paragraph(marks_text, style_marks)
        
        # Table aligning question text to left and marks to right margin
        q_header_table = Table(
            [[question_flowables, marks_para]],
            colWidths=[483.27, 40]
        )
        q_header_table.hAlign = 'LEFT'
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
            
        # Display MCQ options if main question is MCQ
        is_main_mcq = getattr(q, 'question_type', '') == 'MCQ' or getattr(q, 'type', '') == 'MCQ'
        if is_main_mcq:
            sub_questions_list = q.sub_questions if isinstance(q.sub_questions, list) else []
            options = []
            for sub in sub_questions_list[:4]:
                if isinstance(sub, dict):
                    opt_text = sub.get("text", "").strip()
                else:
                    opt_text = getattr(sub, "text", "").strip()
                options.append(opt_text)
                
            while len(options) < 4:
                options.append("")
                
            non_empty_options = [o for o in options if o]
            if non_empty_options:
                prefixes = ["a. ", "b. ", "c. ", "d. "]
                formatted_opts = []
                for o_idx, opt in enumerate(options):
                    opt_str = opt
                    if opt_str and not re.match(r'^[A-Da-d]\s*[\.\)]', opt_str):
                        opt_str = prefixes[o_idx] + opt_str
                    formatted_opts.append(opt_str)
                    
                max_len = max(len(o) for o in formatted_opts) if formatted_opts else 0
                q_flowables.append(Spacer(1, 4))
                if max_len < 15:
                    opt_table = Table([[Paragraph(process_unicode_tags(o), style_opt) for o in formatted_opts]], colWidths=[115]*4)
                elif max_len < 30:
                    opt_table = Table([
                        [Paragraph(process_unicode_tags(formatted_opts[0]), style_opt), Paragraph(process_unicode_tags(formatted_opts[1]), style_opt)],
                        [Paragraph(process_unicode_tags(formatted_opts[2]), style_opt), Paragraph(process_unicode_tags(formatted_opts[3]), style_opt)]
                    ], colWidths=[230, 230])
                else:
                    opt_table = Table([[Paragraph(process_unicode_tags(o), style_opt)] for o in formatted_opts], colWidths=[460])
                
                opt_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                
                # Align options with the main question (indent by 15pt)
                opt_container = Table(
                    [[Spacer(1, 1), opt_table]],
                    colWidths=[15, 508.27]
                )
                opt_container.hAlign = 'LEFT'
                opt_container.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                q_flowables.append(opt_container)
                
        # Display sub-questions if present (and not a main MCQ)
        sub_questions_list = []
        if not is_main_mcq:
            sub_questions_list = q.sub_questions if isinstance(q.sub_questions, list) else []
        for idx, sub in enumerate(sub_questions_list, 1):
            sub_flowables = []
            sub_text = sub.get("text", "").strip()
            
            # If sub_text contains HTML, parse it into flowables
            sub_flowables_list = parse_html_to_flowables(sub_text, style_question)
            if sub_flowables_list:
                # Prepend sub-question number to the first paragraph flowable if it doesn't already have one
                first_flowable = sub_flowables_list[0]
                if isinstance(first_flowable, Paragraph):
                    first_text = first_flowable.text
                    prefix_pattern = r'^(\d+[\.\)]|[a-zA-Z][\.\)]|\([a-zA-Z0-9]\)|[\u0AE6-\u0AEF]+[\.\)])'
                    if not re.match(prefix_pattern, first_text):
                        first_text = f"{idx}. {first_text}"
                    sub_flowables_list[0] = Paragraph(first_text, style_question)
                sub_flowables.extend(sub_flowables_list)
            else:
                sub_flowables.append(Paragraph(f"{idx}. ", style_question))
            
            # Render MCQ options if sub-question type is MCQ
            is_mcq = sub.get("type") == "MCQ" or sub.get("question_type") == "MCQ"
            options = sub.get("options", [])
            non_empty_options = [o for o in options if str(o).strip()]
            if is_mcq and non_empty_options:
                prefixes = ["a. ", "b. ", "c. ", "d. "]
                formatted_opts = []
                for o_idx, opt in enumerate(options[:4]):
                    opt_str = str(opt).strip()
                    if not opt_str:
                        continue
                    # Check if already has a/b/c/d or A/B/C/D prefix
                    if not re.match(r'^[A-Da-d]\s*[\.\)]', opt_str):
                        opt_str = prefixes[o_idx] + opt_str
                    formatted_opts.append(opt_str)
                
                # Pad to at least 4 items to prevent IndexError
                while len(formatted_opts) < 4:
                    formatted_opts.append("")
                    
                max_len = max(len(o) for o in formatted_opts) if formatted_opts else 0
                sub_flowables.append(Spacer(1, 4))
                if max_len < 15:
                    opt_table = Table([[Paragraph(process_unicode_tags(o), style_opt) for o in formatted_opts]], colWidths=[115]*4)
                elif max_len < 30:
                    opt_table = Table([
                        [Paragraph(process_unicode_tags(formatted_opts[0]), style_opt), Paragraph(process_unicode_tags(formatted_opts[1]), style_opt)],
                        [Paragraph(process_unicode_tags(formatted_opts[2]), style_opt), Paragraph(process_unicode_tags(formatted_opts[3]), style_opt)]
                    ], colWidths=[230, 230])
                else:
                    opt_table = Table([[Paragraph(process_unicode_tags(o), style_opt)] for o in formatted_opts], colWidths=[460])
                
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
                colWidths=[20, 463.27, 40]
            )
            sub_q_table.hAlign = 'LEFT'
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