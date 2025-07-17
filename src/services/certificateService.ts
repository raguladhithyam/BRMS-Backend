import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Certificate } from '../models/Certificate';
import { User } from '../models/User';
import { BloodRequest } from '../models/BloodRequest';
import { sendEmail } from './emailService';
import ExcelJS from 'exceljs';

const montserratFontPath = path.join(__dirname, '../fonts/Montserrat_wght.ttf');

export class CertificateService {
  private static uploadsDir = path.join(__dirname, '../../uploads/certificates');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(CertificateService.uploadsDir)) {
      fs.mkdirSync(CertificateService.uploadsDir, { recursive: true });
    }
  }

  async createCertificateRequest(donorId: string, requestId: string): Promise<Certificate> {
    const donor = await User.findByPk(donorId);
    const request = await BloodRequest.findByPk(requestId);

    if (!donor || !request) {
      throw new Error('Donor or request not found');
    }

    // Explicitly generate certificate number
    const certificateNumber = await Certificate.generateCertificateNumber();

    const certificate = await Certificate.create({
      donorId,
      requestId,
      donorName: donor.name,
      bloodGroup: donor.bloodGroup!,
      donationDate: new Date(),
      hospitalName: request.hospitalName,
      units: request.units,
      status: 'pending',
      certificateNumber, // ensure not null
    });

    return certificate;
  }

  async approveCertificate(certificateId: string, adminId: string): Promise<Certificate> {
    const certificate = await Certificate.findByPk(certificateId, {
      include: [
        { model: User, as: 'donor' },
        { model: BloodRequest, as: 'request' }
      ]
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.status !== 'pending') {
      throw new Error('Certificate is not in pending status');
    }

    // Update certificate status
    await certificate.update({
      status: 'approved',
      adminApprovedAt: new Date(),
    });

    // Generate the certificate PDF and update the certificateUrl
    const { certificate: updatedCertificate } = await this.generateCertificate(certificateId);

    // Send emails to all parties (with attachment)
    await this.sendApprovalEmails(updatedCertificate as Certificate & { donor: User; request: BloodRequest });

    return updatedCertificate;
  }

  async generateCertificate(certificateId: string): Promise<{ certificate: Certificate; filePath: string }> {
    const certificate = await Certificate.findByPk(certificateId, {
      include: [
        { model: User, as: 'donor' },
        { model: BloodRequest, as: 'request' }
      ]
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.status !== 'approved') {
      throw new Error('Certificate must be approved before generation');
    }

    // Generate PDF
    const filePath = await this.generatePDF(certificate as Certificate & { donor: User; request: BloodRequest });

    // Update certificate with file path and generated timestamp
    await certificate.update({
      status: 'generated',
      generatedAt: new Date(),
      certificateUrl: filePath,
    });

    return { certificate, filePath };
  }

  private async generatePDF(certificate: Certificate & { donor: User; request: BloodRequest }): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: {
            top: 60,
            bottom: 60,
            left: 60,
            right: 60,
          },
        });

        // Register Montserrat and Poppins fonts
        const montserratFontPath = path.join(__dirname, '../fonts/Montserrat_wght.ttf');
        const poppinsFontPath = path.join(__dirname, '../fonts/Poppins-Regular.ttf');
        doc.registerFont('Montserrat', montserratFontPath);
        doc.registerFont('Montserrat-Bold', montserratFontPath);
        doc.registerFont('Poppins', poppinsFontPath);
        doc.registerFont('Poppins-Bold', poppinsFontPath);

        const fileName = `certificate-${certificate.certificateNumber}.pdf`;
        const filePath = path.join(CertificateService.uploadsDir, fileName);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Creative multi-color header with gradient effect
        const gradient = doc.linearGradient(0, 0, doc.page.width, 0);
        gradient.stop(0, '#dc2626').stop(0.5, '#f59e42').stop(1, '#059669');
        doc.rect(0, 0, doc.page.width, 80).fill(gradient);
        doc.fillColor('#fff')
          .font('Montserrat-Bold')
          .fontSize(36)
          .text('Blood Donation Certificate', 0, 30, { align: 'center', width: doc.page.width });

        // Decorative colored circles
        doc.save();
        doc.circle(80, 60, 30).fill('#f59e42');
        doc.circle(doc.page.width - 80, 60, 30).fill('#059669');
        doc.restore();

        // Certificate Info Box
        doc.roundedRect(60, 110, doc.page.width - 120, 200, 20).fill('#f3f4f6');
        doc.fillColor('#1e293b')
          .font('Montserrat-Bold')
          .fontSize(22)
          .text('Certificate Details', 80, 130);
        doc.font('Poppins')
          .fontSize(14)
          .fillColor('#374151')
          .text(`Certificate No: ${certificate.certificateNumber}`, 80, 165)
          .text(`Issued on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);

        // Donor Info
        doc.font('Montserrat-Bold').fontSize(18).fillColor('#dc2626').text('Donor Information', 80, 220);
        doc.font('Poppins').fontSize(14).fillColor('#334155');
        doc.text(`Name: ${certificate.donorName}`, 80, 250)
          .text(`Blood Group: ${certificate.bloodGroup}`)
          .text(`Roll No: ${certificate.donor.rollNo || 'N/A'}`)
          .text(`Email: ${certificate.donor.email}`);

        // Donation Details
        doc.font('Montserrat-Bold').fontSize(18).fillColor('#059669').text('Donation Details', 400, 220);
        doc.font('Poppins').fontSize(14).fillColor('#334155');
        doc.text(`Hospital: ${certificate.hospitalName}`, 400, 250)
          .text(`Units Donated: ${certificate.units} unit(s)`)
          .text(`Donation Date: ${certificate.donationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
          .text(`Request ID: ${certificate.requestId}`);

        // Thank you message with accent color
        doc.font('Montserrat-Bold').fontSize(20).fillColor('#f59e42')
          .text('Thank you for your life-saving contribution!', 0, 370, { align: 'center', width: doc.page.width });
        doc.font('Poppins').fontSize(12).fillColor('#64748b')
          .text('Your blood donation has the potential to save up to 3 lives.', 0, 400, { align: 'center', width: doc.page.width });

        // Decorative bottom bar
        doc.save();
        doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#dc2626');
        doc.restore();

        // Footer with generation date and time
        doc.font('Poppins').fontSize(10).fillColor('#fff')
          .text('This certificate is issued by the Blood Request Management System', 0, doc.page.height - 35, { align: 'center', width: doc.page.width });
        doc.font('Poppins').fontSize(9).fillColor('#fff')
          .text('Generated on: ' + new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), 0, doc.page.height - 20, { align: 'center', width: doc.page.width });

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', (err) => {
          console.error('PDFKit file stream error:', err);
          reject(new Error('Failed to write PDF file: ' + err));
        });
      } catch (err) {
        console.error('PDFKit general error:', err);
        reject(new Error('PDFKit error: ' + err));
      }
    });
  }

  private addDecorativeElements(doc: PDFKit.PDFDocument): void {
    // Add elegant heart symbols
    const heartSymbol = '♥';
    const positions = [
      { x: 100, y: 150 },
      { x: doc.page.width - 100, y: 150 },
      { x: 100, y: doc.page.height - 150 },
      { x: doc.page.width - 100, y: doc.page.height - 150 },
    ];

    positions.forEach(pos => {
      doc.fontSize(28)
        .fill('#dc2626')
        .text(heartSymbol, pos.x, pos.y);
    });

    // Add subtle decorative lines
    const linePositions = [
      { x: 80, y: 250, width: 60 },
      { x: doc.page.width - 140, y: 250, width: 60 },
      { x: 80, y: doc.page.height - 250, width: 60 },
      { x: doc.page.width - 140, y: doc.page.height - 250, width: 60 },
    ];

    linePositions.forEach(line => {
      doc.moveTo(line.x, line.y)
        .lineTo(line.x + line.width, line.y)
        .lineWidth(1)
        .stroke('#e5e7eb');
    });
  }

  private async sendApprovalEmails(certificate: Certificate & { donor: User; request: BloodRequest }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@brms.com';
    const fileName = `certificate-${certificate.certificateNumber}.pdf`;
    const filePath = certificate.certificateUrl || '';
    // Email to donor (with attachment)
    await sendEmail({
      to: [certificate.donor.email],
      subject: 'Blood Donation Certificate Approved',
      template: 'certificateApproved',
      data: {
        donorName: certificate.donorName,
        certificateNumber: certificate.certificateNumber,
        donationDate: certificate.donationDate.toLocaleDateString(),
        hospitalName: certificate.hospitalName,
      },
      attachments: filePath ? [{ filename: fileName, path: filePath }] : [],
    });

    // Email to requestor (no attachment)
    await sendEmail({
      to: [certificate.request.email],
      subject: 'Blood Donation Completed - Certificate Generated',
      template: 'donationCompleted',
      data: {
        donorName: certificate.donorName,
        bloodGroup: certificate.bloodGroup,
        units: certificate.units,
        hospitalName: certificate.hospitalName,
      },
    });

    // Email to admin (no attachment)
    await sendEmail({
      to: [adminEmail],
      subject: 'Certificate Approved - Blood Donation Completed',
      template: 'adminCertificateApproved',
      data: {
        certificateNumber: certificate.certificateNumber,
        donorName: certificate.donorName,
        requestId: certificate.requestId,
        hospitalName: certificate.hospitalName,
      },
    });
  }

  async getCertificatesByDonor(donorId: string): Promise<Certificate[]> {
    return Certificate.findAll({
      where: { donorId },
      include: [
        { model: BloodRequest, as: 'request' }
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getPendingCertificates(): Promise<Certificate[]> {
    return Certificate.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'donor' },
        { model: BloodRequest, as: 'request' }
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return Certificate.findAll({
      include: [
        { model: User, as: 'donor' },
        { model: BloodRequest, as: 'request' }
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}

export const certificateService = new CertificateService(); 

export async function generateDonationExcelReport(): Promise<string> {
  // Fetch all fulfilled blood requests with donor info
  const requests = await BloodRequest.findAll({
    where: { status: 'fulfilled' },
    include: [
      {
        model: User,
        as: 'assignedDonor',
        attributes: ['name', 'email'],
      },
    ],
    order: [['updatedAt', 'DESC']],
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Donations');

  worksheet.columns = [
    { header: 'Requestor Name', key: 'requestorName', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Blood Group', key: 'bloodGroup', width: 10 },
    { header: 'Units', key: 'units', width: 8 },
    { header: 'Date', key: 'dateTime', width: 18 },
    { header: 'Hospital', key: 'hospitalName', width: 20 },
    { header: 'Location', key: 'location', width: 25 },
    { header: 'Donor Name', key: 'donorName', width: 20 },
    { header: 'Donor Email', key: 'donorEmail', width: 25 },
    { header: 'Date Completed', key: 'updatedAt', width: 18 },
  ];

  requests.forEach((req: any) => {
    worksheet.addRow({
      requestorName: req.requestorName,
      email: req.email,
      phone: req.phone,
      bloodGroup: req.bloodGroup,
      units: req.units,
      dateTime: req.dateTime ? new Date(req.dateTime).toLocaleString() : '',
      hospitalName: req.hospitalName,
      location: req.location,
      donorName: req.assignedDonor?.name || '',
      donorEmail: req.assignedDonor?.email || '',
      updatedAt: req.updatedAt ? new Date(req.updatedAt).toLocaleString() : '',
    });
  });

  // Ensure the reports directory exists
  const reportsDir = path.join(__dirname, '../../uploads/reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const filePath = path.join(reportsDir, `donation-report-${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
} 