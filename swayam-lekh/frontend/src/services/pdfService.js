import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE = {
  width: 210,
  height: 297,
  margin: 15,
};

function toAnswerString(answer) {
  if (!answer) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'object') {
    return Object.entries(answer)
      .map(([part, text]) => `${String(part).toUpperCase()}: ${text || ''}`)
      .join('\n');
  }
  return String(answer);
}

function buildFilename(student = {}) {
  const roll = student.registerNumber || student.registerNo || 'UNKNOWN';
  const subject = (student.subject || 'Subject').replace(/\s+/g, '_');
  const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
  return `${roll}_${subject}_${date}.pdf`;
}

function safeText(value, fallback = '-') {
  return String(value ?? '').trim() || fallback;
}

function drawCoverSheet(doc, student) {
  const pageInnerWidth = PAGE.width - PAGE.margin * 2;

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, PAGE.width, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('SWAYAM-LEKH EXAMINATION SYSTEM', PAGE.width / 2, 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const headerMeta = `${safeText(student.date, new Date().toLocaleDateString('en-IN'))}   |   ${safeText(student.subject, 'General')}`;
  doc.text(headerMeta, PAGE.width / 2, 14, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const photoX = 155;
  const photoY = 25;
  const photoW = 40;
  const photoH = 45;
  doc.rect(photoX, photoY, photoW, photoH);

  if (student.photo) {
    try {
      const isPng = String(student.photo).startsWith('data:image/png');
      doc.addImage(student.photo, isPng ? 'PNG' : 'JPEG', photoX + 1, photoY + 1, photoW - 2, photoH - 2);
    } catch (_err) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  let y = 28;
  const lineGap = 8;
  const labelX = PAGE.margin;
  const valueX = 68;
  const details = [
    ['EXAM ROLL NUMBER', safeText(student.registerNumber || student.registerNo)],
    ['CANDIDATE NAME', safeText(student.name)],
    ['SUBJECT', safeText(student.subject, 'General')],
    ['DATE', safeText(student.date, new Date().toLocaleDateString('en-IN'))],
    ['SCHOOL', safeText(student.school, '-')],
    ['DISABILITY MODE', safeText(student.disabilityMode, '-')],
    ['SUBJECT MODE', safeText(student.subjectMode, '-')],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${label}  :`, labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, valueX, y);
    y += lineGap;
  });

  const cutY = 85;
  doc.setLineDashPattern([3, 3], 0);
  doc.line(PAGE.margin, cutY, PAGE.width - PAGE.margin, cutY);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('✂', 12, 83);
  doc.setFontSize(8);
  doc.text('Cut Here', 16, 83);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FOR OFFICE USE ONLY', PAGE.width / 2, 95, { align: 'center' });

  autoTable(doc, {
    startY: 100,
    head: [['Exam Roll Number', 'Subject', 'Marks in Words', 'Marks in Figures']],
    body: [['', '', '', '']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    margin: { left: PAGE.margin, right: PAGE.margin },
  });

  const declY = 130;
  doc.rect(PAGE.margin, declY, pageInnerWidth, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const declaration = [
    'I hereby declare that the answers written above are my own.',
    'I have not used any unfair means during this examination.',
  ];
  doc.text(declaration, PAGE.margin + 4, declY + 8);

  doc.setFont('helvetica', 'bold');
  doc.text(`Student Name: ${safeText(student.name)}`, PAGE.margin + 4, declY + 24);
  doc.text('Signature: ____________________', PAGE.width - 90, declY + 24);
}

function addPageHeader(doc, rollNo, pageNum) {
  doc.setLineWidth(0.2);
  doc.rect(PAGE.margin, 10, PAGE.width - PAGE.margin * 2, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Roll No: ${safeText(rollNo)}`, PAGE.margin + 3, 17);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNum}`, PAGE.width - PAGE.margin - 3, 17, { align: 'right' });
  doc.line(PAGE.margin, 22.5, PAGE.width - PAGE.margin, 22.5);
}

function getSelectedOptionIndex(question, answerText) {
  if (!Array.isArray(question?.options) || !question.options.length) return -1;
  const normalized = (answerText || '').trim().toLowerCase();
  const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
  const directLetter = letters.indexOf(normalized);
  if (directLetter >= 0 && directLetter < question.options.length) return directLetter;
  return question.options.findIndex((opt) => String(opt).trim().toLowerCase() === normalized);
}

function renderAnswerPages(doc, student, questions, answers) {
  doc.addPage();
  let pageNum = 2;
  let y = 25;
  const contentWidth = PAGE.width - PAGE.margin * 2;

  addPageHeader(doc, student.registerNumber || student.registerNo, pageNum);

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const answerText = toAnswerString(answers?.[q.id]);

    if (y > 270 - 40) {
      doc.addPage();
      pageNum += 1;
      addPageHeader(doc, student.registerNumber || student.registerNo, pageNum);
      y = 25;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const qHeader = `Q${i + 1}.  [${q.marks ?? '-'} Marks]  -  ${safeText(q.subject, student.subject || 'General')}`;
    const qHeaderLines = doc.splitTextToSize(qHeader, contentWidth);
    doc.text(qHeaderLines, PAGE.margin, y);
    y += qHeaderLines.length * 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const qTextLines = doc.splitTextToSize(safeText(q.text, '-'), contentWidth);
    doc.text(qTextLines, PAGE.margin, y);
    y += qTextLines.length * 5 + 2;

    if (answerText) {
      doc.setFont('helvetica', 'bold');
      doc.text('Answer:', PAGE.margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const answerLines = doc.splitTextToSize(answerText, contentWidth);
      doc.text(answerLines, PAGE.margin, y);
      y += answerLines.length * 5;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Answer: [Not Attempted]', PAGE.margin, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
    }

    if (Array.isArray(q.options) && q.options.length) {
      const selectedIndex = getSelectedOptionIndex(q, answerText);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      q.options.forEach((option, idx) => {
        const marker = selectedIndex === idx ? '►' : ' ';
        const optLabel = String.fromCharCode(65 + idx);
        const line = `${marker} ${optLabel}. ${option}`;
        const optionLines = doc.splitTextToSize(line, contentWidth - 3);
        doc.text(optionLines, PAGE.margin + 3, y);
        y += optionLines.length * 5;
      });
    }

    y += 2;
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
    y += 8;
  }
}

export async function generateAnswerSheet(student = {}, questions = [], answers = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');

  drawCoverSheet(doc, student);
  renderAnswerPages(doc, student, questions, answers);

  const filename = buildFilename(student);
  doc.save(filename);
}