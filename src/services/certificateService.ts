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
        layout: 'landscape',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const fileName = `certificate-${certificate.certificateNumber}.pdf`;
      const filePath = path.join(CertificateService.uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Add background
      doc.rect(0, 0, doc.page.width, doc.page.height)
        .fill('#f8f9fa');

      // Add border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(3)
        .stroke('#dc3545');

      // Add inner border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
        .lineWidth(1)
        .stroke('#6c757d');

      // Header
      doc.fontSize(36)
        .font('Helvetica-Bold')
        .fill('#dc3545')
        .text('BLOOD DONATION CERTIFICATE', doc.page.width / 2, 80, {
          align: 'center',
        });

      // Certificate number
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6c757d')
        .text(`Certificate No: ${certificate.certificateNumber}`, doc.page.width / 2, 140, {
          align: 'center',
        });

      // Date
      doc.fontSize(14)
        .font('Helvetica')
        .fill('#6c757d')
        .text(`Date: ${new Date().toLocaleDateString()}`, doc.page.width / 2, 160, {
          align: 'center',
        });

      // Main content
      const centerY = doc.page.height / 2;
      const leftX = 100;
      const rightX = doc.page.width - 100;

      // Left side - Donor Information
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fill('#212529')
        .text('DONOR INFORMATION', leftX, centerY - 80);

      doc.fontSize(12)
        .font('Helvetica')
        .fill('#495057');

      doc.text(`Name: ${certificate.donorName}`, leftX, centerY - 50);
      doc.text(`Blood Group: ${certificate.bloodGroup}`, leftX, centerY - 30);
      doc.text(`Roll No: ${certificate.donor.rollNo || 'N/A'}`, leftX, centerY - 10);
      doc.text(`Email: ${certificate.donor.email}`, leftX, centerY + 10);

      // Right side - Donation Details
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fill('#212529')
        .text('DONATION DETAILS', rightX, centerY - 80);

      doc.fontSize(12)
        .font('Helvetica')
        .fill('#495057');

      doc.text(`Hospital: ${certificate.hospitalName}`, rightX, centerY - 50);
      doc.text(`Units Donated: ${certificate.units}`, rightX, centerY - 30);
      doc.text(`Donation Date: ${certificate.donationDate.toLocaleDateString()}`, rightX, centerY - 10);
      doc.text(`Request ID: ${certificate.requestId}`, rightX, centerY + 10);

      // Bottom section
      const bottomY = doc.page.height - 120;

      // Appreciation message
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fill('#28a745')
        .text('Thank you for your life-saving contribution!', doc.page.width / 2, bottomY, {
          align: 'center',
        });

      doc.fontSize(12)
        .font('Helvetica')
        .fill('#6c757d')
        .text('Your blood donation has the potential to save up to 3 lives.', doc.page.width / 2, bottomY + 25, {
          align: 'center',
        });

      // Footer
      doc.fontSize(10)
        .font('Helvetica')
        .fill('#6c757d')
        .text('This certificate is issued by the Blood Request Management System', doc.page.width / 2, doc.page.height - 60, {
          align: 'center',
        });

      doc.fontSize(10)
        .font('Helvetica')
        .fill('#6c757d')
        .text('Generated on: ' + new Date().toLocaleString(), doc.page.width / 2, doc.page.height - 40, {
          align: 'center',
        });

      // Add decorative elements
      this.addDecorativeElements(doc);

      doc.end();

      stream.on('finish', () => {
        resolve(`/uploads/certificates/${fileName}`);
      });

      stream.on('error', reject);
    });
  }

  private addDecorativeElements(doc: PDFKit.PDFDocument): void {
    // Add heart symbols
    const heartSymbol = '♥';
    const positions = [
      { x: 80, y: 100 },
      { x: doc.page.width - 80, y: 100 },
      { x: 80, y: doc.page.height - 100 },
      { x: doc.page.width - 80, y: doc.page.height - 100 },
    ];

    positions.forEach(pos => {
      doc.fontSize(24)
        .fill('#dc3545')
        .text(heartSymbol, pos.x, pos.y);
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