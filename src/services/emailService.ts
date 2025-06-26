import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "mra20031006@gmail.com",
    pass: "wszlgzaaibqvcwan",
  },
});

interface EmailData {
  to: string[];
  subject: string;
  template: string;
  data: any;
}

const templates = {
  newBloodRequest: (data: any) => `
    <h2>New Blood Request Submitted</h2>
    <p>A new blood request has been submitted and requires your review:</p>
    <ul>
      <li><strong>Requestor:</strong> ${data.requestorName}</li>
      <li><strong>Blood Group:</strong> ${data.bloodGroup}</li>
      <li><strong>Units:</strong> ${data.units}</li>
      <li><strong>Urgency:</strong> ${data.urgency}</li>
      <li><strong>Hospital:</strong> ${data.hospitalName}</li>
      <li><strong>Location:</strong> ${data.location}</li>
      <li><strong>Required Date:</strong> ${new Date(data.dateTime).toLocaleString()}</li>
    </ul>
    <p>Please log in to the admin panel to review and approve this request.</p>
  `,

  requestConfirmation: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626; text-align: center;">🩸 Blood Request Submitted Successfully</h2>
      
      <p>Dear <strong>${data.requestorName}</strong>,</p>
      
      <p>Thank you for submitting your blood request through BloodConnect. We have received your request and our admin team will review it shortly.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Your Request Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;"><strong>Blood Group:</strong> ${data.bloodGroup}</li>
          <li style="margin: 8px 0;"><strong>Units Required:</strong> ${data.units}</li>
          <li style="margin: 8px 0;"><strong>Urgency Level:</strong> ${data.urgency}</li>
          <li style="margin: 8px 0;"><strong>Hospital:</strong> ${data.hospitalName}</li>
          <li style="margin: 8px 0;"><strong>Location:</strong> ${data.location}</li>
          <li style="margin: 8px 0;"><strong>Required Date & Time:</strong> ${new Date(data.dateTime).toLocaleString()}</li>
          ${data.notes ? `<li style="margin: 8px 0;"><strong>Additional Notes:</strong> ${data.notes}</li>` : ''}
        </ul>
      </div>
      
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #1e40af; margin-top: 0;">What happens next?</h4>
        <ol style="color: #1e40af;">
          <li>Our admin team will review your request within 2-4 hours</li>
          <li>Once approved, eligible donors will be notified automatically</li>
          <li>You'll receive donor contact information when someone opts in</li>
          <li>We'll keep you updated throughout the process</li>
        </ol>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #92400e; margin-top: 0;">Emergency Contact:</h4>
        <p style="color: #92400e; margin: 0;">
          For urgent requests, please call: <strong>+1 (555) 123-4567</strong><br>
          Available 24/7 for critical situations
        </p>
      </div>
      
      <p style="color: #6b7280;">If you have any questions, please don't hesitate to contact our support team.</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px;">
          Thank you for using BloodConnect<br>
          Saving lives together ❤️
        </p>
      </div>
    </div>
  `,

  requestApproved: (data: any) => `
    <h2>Blood Request Available</h2>
    <p>A blood request matching your blood type has been approved:</p>
    <ul>
      <li><strong>Requestor:</strong> ${data.requestorName}</li>
      <li><strong>Blood Group:</strong> ${data.bloodGroup}</li>
      <li><strong>Units:</strong> ${data.units}</li>
      <li><strong>Urgency:</strong> ${data.urgency}</li>
      <li><strong>Hospital:</strong> ${data.hospitalName}</li>
      <li><strong>Location:</strong> ${data.location}</li>
      <li><strong>Required Date:</strong> ${new Date(data.dateTime).toLocaleString()}</li>
    </ul>
    <p>If you're available to help, please log in to opt in for this request.</p>
  `,

  requestRejected: (data: any) => `
    <h2>Blood Request Update</h2>
    <p>Dear ${data.requestorName},</p>
    <p>We regret to inform you that your blood request could not be approved at this time.</p>
    <p><strong>Reason:</strong> ${data.reason}</p>
    <p>Please feel free to submit a new request or contact us for assistance.</p>
  `,

  donorAssigned: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626; text-align: center;">🎉 Donor Found for Your Blood Request!</h2>
      
      <p>Dear <strong>${data.requestorName}</strong>,</p>
      
      <p>Great news! We have found a donor for your <strong>${data.bloodGroup}</strong> blood request.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Donor Contact Information:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;"><strong>Name:</strong> ${data.donorName}</li>
          <li style="margin: 8px 0;"><strong>Email:</strong> ${data.donorEmail}</li>
          <li style="margin: 8px 0;"><strong>Phone:</strong> ${data.donorPhone || 'Not provided'}</li>
          <li style="margin: 8px 0;"><strong>Blood Group:</strong> ${data.bloodGroup}</li>
        </ul>
      </div>
      
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">Your Request Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;"><strong>Units Required:</strong> ${data.units}</li>
          <li style="margin: 8px 0;"><strong>Hospital:</strong> ${data.hospitalName}</li>
          <li style="margin: 8px 0;"><strong>Location:</strong> ${data.location}</li>
          <li style="margin: 8px 0;"><strong>Required Date & Time:</strong> ${new Date(data.dateTime).toLocaleString()}</li>
        </ul>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #92400e; margin-top: 0;">Next Steps:</h4>
        <ol style="color: #92400e;">
          <li>Contact the donor directly using the information provided above</li>
          <li>Coordinate the donation time and location</li>
          <li>Ensure all medical requirements are met</li>
          <li>Bring necessary identification and medical documents</li>
        </ol>
      </div>
      
      <p style="color: #6b7280;">If you have any questions or need assistance, please contact our support team.</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px;">
          Thank you for using BloodConnect<br>
          Saving lives together ❤️
        </p>
      </div>
    </div>
  `,

  donorSelected: (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626; text-align: center;">🩸 You've Been Selected as a Blood Donor!</h2>
      
      <p>Dear <strong>${data.donorName}</strong>,</p>
      
      <p>Thank you for opting in! You have been selected to donate <strong>${data.bloodGroup}</strong> blood. Your willingness to help save lives is truly appreciated.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Requestor Contact Information:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;"><strong>Name:</strong> ${data.requestorName}</li>
          <li style="margin: 8px 0;"><strong>Email:</strong> ${data.requestorEmail}</li>
          <li style="margin: 8px 0;"><strong>Phone:</strong> ${data.requestorPhone}</li>
        </ul>
      </div>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #dc2626; margin-top: 0;">Donation Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;"><strong>Blood Group:</strong> ${data.bloodGroup}</li>
          <li style="margin: 8px 0;"><strong>Units Required:</strong> ${data.units}</li>
          <li style="margin: 8px 0;"><strong>Urgency:</strong> <span style="text-transform: capitalize; color: ${data.urgency === 'critical' ? '#dc2626' : data.urgency === 'high' ? '#ea580c' : data.urgency === 'medium' ? '#ca8a04' : '#16a34a'};">${data.urgency}</span></li>
          <li style="margin: 8px 0;"><strong>Hospital:</strong> ${data.hospitalName}</li>
          <li style="margin: 8px 0;"><strong>Location:</strong> ${data.location}</li>
          <li style="margin: 8px 0;"><strong>Required Date & Time:</strong> ${new Date(data.dateTime).toLocaleString()}</li>
        </ul>
      </div>
      
      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #166534; margin-top: 0;">What to do next:</h4>
        <ol style="color: #166534;">
          <li>Contact the requestor using the information provided above</li>
          <li>Coordinate the donation time and confirm the location</li>
          <li>Ensure you're well-rested and have eaten before donation</li>
          <li>Bring a valid ID and any required medical documents</li>
          <li>Follow all pre-donation guidelines</li>
        </ol>
      </div>
      
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #1e40af; margin-top: 0;">Pre-Donation Reminders:</h4>
        <ul style="color: #1e40af; list-style: disc; padding-left: 20px;">
          <li>Get adequate sleep (6-8 hours)</li>
          <li>Eat a healthy meal before donation</li>
          <li>Drink plenty of water</li>
          <li>Avoid alcohol for 24 hours before donation</li>
          <li>Inform about any medications you're taking</li>
        </ul>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #92400e; margin-top: 0;">Important Note:</h4>
        <p style="color: #92400e; margin: 0;">
          After this donation, you will be marked as unavailable for the next 3 months to ensure your health and safety. This is in accordance with medical guidelines for blood donation frequency.
        </p>
      </div>
      
      <p style="color: #6b7280;">If you have any questions or concerns, please contact our support team immediately.</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px;">
          Thank you for being a life-saver!<br>
          BloodConnect Team ❤️
        </p>
      </div>
    </div>
  `,

  studentWelcome: (data: any) => `
    <h2>Welcome to BloodConnect</h2>
    <p>Dear ${data.name},</p>
    <p>Your student donor account has been created successfully!</p>
    <p><strong>Login Credentials:</strong></p>
    <ul>
      <li><strong>Email:</strong> ${data.email}</li>
      <li><strong>Temporary Password:</strong> ${data.tempPassword}</li>
    </ul>
    <p>Please log in and change your password: <a href="${data.loginUrl}">Login Here</a></p>
    <p>Thank you for joining our life-saving community!</p>
  `,
};

export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const { to, subject, template, data } = emailData;

    const htmlContent = templates[template as keyof typeof templates](data);

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: to.join(', '),
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to: ${to.join(', ')}`);
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
};