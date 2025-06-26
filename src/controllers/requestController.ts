import { Request, Response } from 'express';
import { BloodRequest, User, StudentOptIn } from '../models/associations';
import { emitToAdmins, emitToStudents } from '../config/socket';
import { createNotification } from '../services/notificationService';
import { sendEmail } from '../services/emailService';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
  user?: User;
}

export const createBloodRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received blood request data:', req.body);
    
    const requestData = req.body;

    // Validate required fields
    const requiredFields = ['requestorName', 'email', 'phone', 'bloodGroup', 'units', 'dateTime', 'hospitalName', 'location', 'urgency'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: missingFields.map(field => ({
          field,
          message: `${field} is required`
        }))
      });
      return;
    }

    // Validate date is in the future
    const requestDate = new Date(requestData.dateTime);
    const now = new Date();
    
    if (requestDate <= now) {
      console.log('Invalid date:', requestData.dateTime, 'Current time:', now.toISOString());
      res.status(400).json({
        success: false,
        message: 'Date and time must be in the future',
        errors: [{
          field: 'dateTime',
          message: 'Date and time must be in the future'
        }]
      });
      return;
    }

    // Validate blood group
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodGroups.includes(requestData.bloodGroup)) {
      console.log('Invalid blood group:', requestData.bloodGroup);
      res.status(400).json({
        success: false,
        message: 'Invalid blood group',
        errors: [{
          field: 'bloodGroup',
          message: 'Invalid blood group'
        }]
      });
      return;
    }

    // Validate urgency
    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    if (!validUrgencies.includes(requestData.urgency)) {
      console.log('Invalid urgency:', requestData.urgency);
      res.status(400).json({
        success: false,
        message: 'Invalid urgency level',
        errors: [{
          field: 'urgency',
          message: 'Invalid urgency level'
        }]
      });
      return;
    }

    // Validate units
    const units = parseInt(requestData.units);
    if (isNaN(units) || units < 1 || units > 10) {
      console.log('Invalid units:', requestData.units);
      res.status(400).json({
        success: false,
        message: 'Units must be between 1 and 10',
        errors: [{
          field: 'units',
          message: 'Units must be between 1 and 10'
        }]
      });
      return;
    }

    // Create blood request
    const bloodRequest = await BloodRequest.create({
      ...requestData,
      units: units,
      dateTime: requestDate,
    });

    console.log('Blood request created successfully:', bloodRequest.id);

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Notify all admins
    if (io) {
      emitToAdmins(io, 'request_created', {
        message: `New blood request: ${bloodRequest.bloodGroup} needed`,
        bloodGroup: bloodRequest.bloodGroup,
        urgency: bloodRequest.urgency,
        requestId: bloodRequest.id,
      });
    }

    // Create notifications for all admins
    try {
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: 'request_created',
          title: 'New Blood Request',
          message: `${bloodRequest.requestorName} needs ${bloodRequest.bloodGroup} blood (${bloodRequest.units} units)`,
          metadata: { requestId: bloodRequest.id },
        });
      }

      // Send email to admins
      const adminEmails = admins.map(admin => admin.email);
      if (adminEmails.length > 0) {
        await sendEmail({
          to: adminEmails,
          subject: `New Blood Request - ${bloodRequest.bloodGroup} Needed`,
          template: 'newBloodRequest',
          data: {
            requestorName: bloodRequest.requestorName,
            bloodGroup: bloodRequest.bloodGroup,
            units: bloodRequest.units,
            urgency: bloodRequest.urgency,
            hospitalName: bloodRequest.hospitalName,
            location: bloodRequest.location,
            dateTime: bloodRequest.dateTime,
          },
        });
      }

      // Send confirmation email to requestor
      await sendEmail({
        to: [bloodRequest.email],
        subject: 'Blood Request Submitted Successfully',
        template: 'requestConfirmation',
        data: {
          requestorName: bloodRequest.requestorName,
          bloodGroup: bloodRequest.bloodGroup,
          units: bloodRequest.units,
          urgency: bloodRequest.urgency,
          hospitalName: bloodRequest.hospitalName,
          location: bloodRequest.location,
          dateTime: bloodRequest.dateTime,
          notes: bloodRequest.notes,
        },
      });

    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({
      success: true,
      data: bloodRequest,
      message: 'Blood request submitted successfully',
    });
  } catch (error) {
    console.error('Create blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getMatchingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Update user availability based on donation eligibility
    const isAvailable = req.user.isAvailableForDonation();
    if (req.user.availability !== isAvailable) {
      await req.user.update({ availability: isAvailable });
    }

    // Get approved requests matching user's blood group (only if user is available)
    const matchingRequests = await BloodRequest.findAll({
      where: {
        bloodGroup: req.user.bloodGroup,
        status: 'approved',
        dateTime: {
          [Op.gte]: new Date(),
        },
      },
      include: [
        {
          model: StudentOptIn,
          as: 'optedInStudents',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
      order: [['urgency', 'DESC'], ['createdAt', 'ASC']],
    });

    // Only return requests if user is available for donation
    const filteredRequests = req.user.availability ? matchingRequests : [];

    res.json({
      success: true,
      data: filteredRequests,
    });
  } catch (error) {
    console.error('Get matching requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const optInToRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: requestId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Check if user is available for donation (3 months rule)
    if (!req.user.isAvailableForDonation()) {
      const nextAvailableDate = req.user.getNextAvailableDonationDate();
      res.status(400).json({
        success: false,
        message: `You are not eligible to donate yet. You can donate again after ${nextAvailableDate?.toLocaleDateString()}`,
      });
      return;
    }

    // Check if request exists and is approved
    const bloodRequest = await BloodRequest.findOne({
      where: {
        id: requestId,
        status: 'approved',
      },
    });

    if (!bloodRequest) {
      res.status(404).json({
        success: false,
        message: 'Blood request not found or not approved',
      });
      return;
    }

    // Check if user's blood group matches
    if (bloodRequest.bloodGroup !== req.user.bloodGroup) {
      res.status(400).json({
        success: false,
        message: 'Your blood group does not match this request',
      });
      return;
    }

    // Check if user has already opted in
    const existingOptIn = await StudentOptIn.findOne({
      where: {
        studentId: req.user.id,
        requestId,
      },
    });

    if (existingOptIn) {
      res.status(400).json({
        success: false,
        message: 'You have already opted in to this request',
      });
      return;
    }

    // Create opt-in record
    const optIn = await StudentOptIn.create({
      studentId: req.user.id,
      requestId,
    });

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Notify admins
    if (io) {
      emitToAdmins(io, 'student_opted_in', {
        message: `${req.user.name} opted in for ${bloodRequest.bloodGroup} request`,
        studentName: req.user.name,
        bloodGroup: bloodRequest.bloodGroup,
        requestId,
      });
    }

    // Create notifications for admins
    try {
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: 'student_opted_in',
          title: 'Student Opted In',
          message: `${req.user.name} opted in for ${bloodRequest.requestorName}'s ${bloodRequest.bloodGroup} request`,
          metadata: { requestId, studentId: req.user.id },
        });
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.json({
      success: true,
      data: optIn,
      message: 'Successfully opted in to blood request',
    });
  } catch (error) {
    console.error('Opt in to request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getStudentOptIns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const optIns = await StudentOptIn.findAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: BloodRequest,
          as: 'request',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: optIns,
    });
  } catch (error) {
    console.error('Get student opt-ins error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};