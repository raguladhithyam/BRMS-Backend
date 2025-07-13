import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Certificate } from '../models/Certificate';
import { User } from '../models/User';
import { BloodRequest } from '../models/BloodRequest';
import { sendEmail } from './emailService';

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

    // Send emails to all parties
    await this.sendApprovalEmails(certificate as Certificate & { donor: User; request: BloodRequest });

    return certificate;
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
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: {
          top: 60,
          bottom: 60,
          left: 60,
          right: 60,
        },
      });

      const fileName = `certificate-${certificate.certificateNumber}.pdf`;
      const filePath = path.join(CertificateService.uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Add elegant background gradient
      const gradient = doc.linearGradient(0, 0, 0, doc.page.height);
      gradient.stop(0, '#ffffff');
      gradient.stop(1, '#f8f9fa');
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(gradient);

      // Add decorative border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(4)
        .stroke('#dc2626');

      // Add inner decorative border
      doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70)
        .lineWidth(1)
        .stroke('#e5e7eb');

      // Add corner decorations
      const cornerSize = 20;
      const positions = [
        { x: 20, y: 20 },
        { x: doc.page.width - 20 - cornerSize, y: 20 },
        { x: 20, y: doc.page.height - 20 - cornerSize },
        { x: doc.page.width - 20 - cornerSize, y: doc.page.height - 20 - cornerSize }
      ];

      positions.forEach(pos => {
        doc.rect(pos.x, pos.y, cornerSize, cornerSize)
          .lineWidth(2)
          .stroke('#dc2626');
      });

      // Header with elegant styling
      doc.fontSize(42)
        .font('Helvetica-Bold')
        .fill('#dc2626')
        .text('BLOOD DONATION', doc.page.width / 2, 80, {
          align: 'center',
        });

      doc.fontSize(32)
        .font('Helvetica-Bold')
        .fill('#dc2626')
        .text('CERTIFICATE', doc.page.width / 2, 120, {
          align: 'center',
        });

      // Certificate number with elegant styling
      doc.fontSize(16)
        .font('Helvetica')
        .fill('#6b7280')
        .text(`Certificate No: ${certificate.certificateNumber}`, doc.page.width / 2, 180, {
          align: 'center',
        });

      // Date
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(`Issued on: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`, doc.page.width / 2, 200, {
          align: 'center',
        });

      // Main content area with better spacing
      const contentStartY = 280;
      const sectionSpacing = 120;

      // Donor Information Section
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fill('#1f2937')
        .text('DONOR INFORMATION', doc.page.width / 2, contentStartY, {
          align: 'center',
        });

      // Add underline for section header
      doc.moveTo(doc.page.width / 2 - 80, contentStartY + 10)
        .lineTo(doc.page.width / 2 + 80, contentStartY + 10)
        .lineWidth(2)
        .stroke('#dc2626');

      const donorInfoY = contentStartY + 50;
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151');

      doc.text('Name:', 100, donorInfoY);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.donorName, 200, donorInfoY);

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151')
        .text('Blood Group:', 100, donorInfoY + 30);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.bloodGroup, 200, donorInfoY + 30);

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151')
        .text('Roll No:', 100, donorInfoY + 60);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.donor.rollNo || 'N/A', 200, donorInfoY + 60);

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151')
        .text('Email:', 100, donorInfoY + 90);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.donor.email, 200, donorInfoY + 90);

      // Donation Details Section
      const donationInfoY = contentStartY + sectionSpacing + 50;
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fill('#1f2937')
        .text('DONATION DETAILS', doc.page.width / 2, donationInfoY, {
          align: 'center',
        });

      // Add underline for section header
      doc.moveTo(doc.page.width / 2 - 80, donationInfoY + 10)
        .lineTo(doc.page.width / 2 + 80, donationInfoY + 10)
        .lineWidth(2)
        .stroke('#dc2626');

      const donationDetailsY = donationInfoY + 50;
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151');

      doc.text('Hospital:', 100, donationDetailsY);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.hospitalName, 200, donationDetailsY);

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151')
        .text('Units Donated:', 100, donationDetailsY + 30);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(`${certificate.units} unit(s)`, 200, donationDetailsY + 30);

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151')
        .text('Donation Date:', 100, donationDetailsY + 60);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.donationDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }), 200, donationDetailsY + 60);

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#374151')
        .text('Request ID:', 100, donationDetailsY + 90);
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text(certificate.requestId, 200, donationDetailsY + 90);

      // Appreciation message with better styling
      const appreciationY = doc.page.height - 200;
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fill('#059669')
        .text('Thank you for your life-saving contribution!', doc.page.width / 2, appreciationY, {
          align: 'center',
        });

      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6b7280')
        .text('Your blood donation has the potential to save up to 3 lives.', doc.page.width / 2, appreciationY + 30, {
          align: 'center',
        });

      // Footer with better styling
      doc.fontSize(12)
        .font('Helvetica')
        .fill('#9ca3af')
        .text('This certificate is issued by the Blood Request Management System', doc.page.width / 2, doc.page.height - 80, {
          align: 'center',
        });

      doc.fontSize(10)
        .font('Helvetica')
        .fill('#9ca3af')
        .text('Generated on: ' + new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }), doc.page.width / 2, doc.page.height - 60, {
          align: 'center',
        });

      // Add elegant decorative elements
      this.addDecorativeElements(doc);

      doc.end();

      stream.on('finish', () => {
        resolve(`/uploads/certificates/${fileName}`);
      });

      stream.on('error', reject);
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
    
    // Email to donor
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
    });

    // Email to requestor
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

    // Email to admin
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