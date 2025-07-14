import { Request, Response } from 'express';
import { certificateService } from '../services/certificateService';
import { User } from '../models/User';
import { BloodRequest } from '../models/BloodRequest';
import { Certificate } from '../models/Certificate';
import path from 'path';
import fs from 'fs';

interface AuthRequest extends Request {
  user?: User;
}

// Create certificate request (student marks donation as completed)
export const createCertificateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.body;
    const donorId = req.user!.id;

    // Check if certificate already exists for this donor and request
    const existingCertificate = await Certificate.findOne({
      where: { donorId, requestId }
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate request already exists for this donation'
      });
    }

    const certificate = await certificateService.createCertificateRequest(donorId, requestId);

    return res.status(201).json({
      success: true,
      message: 'Certificate request created successfully',
      data: certificate
    });
  } catch (error: any) {
    console.error('Create certificate request error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create certificate request'
    });
  }
};

// Get certificates for a donor (student dashboard)
export const getDonorCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = req.user!.id;
    const certificates = await certificateService.getCertificatesByDonor(donorId);

    res.json({
      success: true,
      data: certificates
    });
  } catch (error: any) {
    console.error('Get donor certificates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch certificates'
    });
  }
};

// Get pending certificates (admin dashboard)
export const getPendingCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const certificates = await certificateService.getPendingCertificates();

    res.json({
      success: true,
      data: certificates
    });
  } catch (error: any) {
    console.error('Get pending certificates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending certificates'
    });
  }
};

// Get all certificates (admin dashboard)
export const getAllCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const certificates = await certificateService.getAllCertificates();

    res.json({
      success: true,
      data: certificates
    });
  } catch (error: any) {
    console.error('Get all certificates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch certificates'
    });
  }
};

// Approve certificate (admin)
export const approveCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    const certificate = await certificateService.approveCertificate(id, adminId);

    return res.json({
      success: true,
      message: 'Certificate approved successfully',
      data: certificate
    });
  } catch (error: any) {
    console.error('Approve certificate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve certificate'
    });
  }
};

// Generate certificate PDF (admin)
export const generateCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { certificate, filePath } = await certificateService.generateCertificate(id);

    res.json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        certificate,
        downloadUrl: filePath
      }
    });
  } catch (error: any) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate certificate'
    });
  }
};

// Download certificate PDF
export const downloadCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const certificate = await Certificate.findByPk(id, {
      include: [
        { model: User, as: 'donor' },
        { model: BloodRequest, as: 'request' }
      ]
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check if user has permission to download this certificate
    const isAdmin = req.user!.role === 'admin';
    const isOwner = certificate.donorId === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download this certificate'
      });
    }

    if (certificate.status !== 'generated') {
      return res.status(400).json({
        success: false,
        message: 'Certificate has not been generated yet'
      });
    }

    if (!certificate.certificateUrl) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }

    // Construct file path
    const fileName = path.basename(certificate.certificateUrl);
    const filePath = path.join(__dirname, '../../uploads/certificates', fileName);
    
    // Alternative: if certificateUrl is a full path, use it directly
    let finalFilePath = filePath;
    if (certificate.certificateUrl.startsWith('/uploads/')) {
      // Remove the /uploads prefix and construct the full path
      const relativePath = certificate.certificateUrl.replace('/uploads/', '');
      finalFilePath = path.join(__dirname, '../../uploads', relativePath);
    }

    // Check if file exists
    if (!fs.existsSync(finalFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found on server'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"certificate-${certificate.certificateNumber}.pdf\"`);

    // Stream the file
    const fileStream = fs.createReadStream(finalFilePath);
    fileStream.pipe(res);
    return;
  } catch (error: any) {
    console.error('Download certificate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to download certificate'
    });
  }
};

// Get certificate by ID
export const getCertificateById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const certificate = await Certificate.findByPk(id, {
      include: [
        { model: User, as: 'donor' },
        { model: BloodRequest, as: 'request' }
      ]
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check if user has permission to view this certificate
    const isAdmin = req.user!.role === 'admin';
    const isOwner = certificate.donorId === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this certificate'
      });
    }

    return res.json({
      success: true,
      data: certificate
    });
  } catch (error: any) {
    console.error('Get certificate by ID error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch certificate'
    });
  }
}; 