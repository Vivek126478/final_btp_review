const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Create transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASSWORD in environment');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send OTP email
exports.sendOTPEmail = async (email, otp) => {
  try {
    const subject = 'Your OTP for Campus Wheels Verification';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <div style="background-color: #4F46E5; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Campus Wheels</h1>
            <p style="color: #E0E7FF; margin: 5px 0 0 0;">IIIT Kottayam Carpooling Platform</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1F2937; margin-top: 0;">Email Verification</h2>
            <p style="color: #4B5563; font-size: 16px;">Your One-Time Password (OTP) for email verification is:</p>
            
            <div style="background-color: #EEF2FF; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <h1 style="color: #4F46E5; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
              <strong>⏱️ This OTP will expire in 10 minutes.</strong>
            </p>
            
            <p style="color: #6B7280; font-size: 14px;">
              If you didn't request this OTP, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
            
            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
              This is an automated email from Campus Wheels. Please do not reply.
            </p>
          </div>
        </div>
      `;

    if (process.env.RESEND_API_KEY) {
      try {
        const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = `Campus Wheels - IIIT Kottayam <${resendFromEmail}>`;

        const result = await resend.emails.send({
          from,
          to: email,
          subject,
          html
        });

        if (result?.error) {
          throw new Error(result.error?.message || 'Resend failed to send email');
        }

        console.log('OTP email sent via Resend to:', email);
        return true;
      } catch (resendError) {
        const msg = resendError?.message || '';
        console.warn('Resend OTP failed, falling back to SMTP. Reason:', msg);
      }
    }

    const transporter = createTransporter();
    const mailOptions = {
      from: `"Campus Wheels - IIIT Kottayam" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent via SMTP to:', email);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

exports.sendRideBoardingOTPEmail = async ({
  participantEmail,
  participantUsername,
  ride,
  otp
}) => {
  try {
    const subject = 'Your Ride Boarding OTP';
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: participantEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${subject}</h2>
          <p>Hi ${participantUsername || 'there'},</p>
          <p>The host has started boarding verification for your ride.</p>
          <h3>Ride Details</h3>
          <ul>
            <li><strong>From:</strong> ${ride.startLocation}</li>
            <li><strong>To:</strong> ${ride.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(ride.rideDateTime).toLocaleString()}</li>
          </ul>
          <p><strong>Your Boarding OTP:</strong></p>
          <div style="background-color:#EEF2FF;padding:16px;border-radius:8px;text-align:center;margin:16px 0;">
            <div style="font-size:28px;letter-spacing:6px;font-family: monospace;color:#4F46E5;">${otp}</div>
          </div>
          <p style="color:#6B7280;font-size:14px;"><strong>This OTP expires soon.</strong> Share it only with the host at boarding time.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Ride boarding OTP sent to:', participantEmail);
  } catch (error) {
    console.error('Error sending ride boarding OTP:', error);
  }
};

exports.sendSearchAlertMatchEmail = async ({
  toEmail,
  username,
  filters,
  ride,
  rideLink
}) => {
  try {
    const subject = 'A new ride matches your search';
    const transporter = createTransporter();

    const filtersHtml = Object.entries(filters || {})
      .filter(([_, v]) => v !== undefined && v !== null && String(v) !== '')
      .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
      .join('');

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16A34A;">${subject}</h2>
          <p>Hi ${username || 'there'},</p>
          <p>A ride is now available that matches the filters you searched for.</p>
          <h3>Your saved filters</h3>
          <ul>${filtersHtml || '<li>(none)</li>'}</ul>
          <h3>Matching ride</h3>
          <ul>
            <li><strong>From:</strong> ${ride.startLocation}</li>
            <li><strong>To:</strong> ${ride.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(ride.rideDateTime).toLocaleString()}</li>
            <li><strong>Price per seat:</strong> ₹${ride.pricePerSeat || 0}</li>
            <li><strong>Available seats:</strong> ${ride.availableSeats} / ${ride.totalSeats}</li>
          </ul>
          ${rideLink ? `
            <p>
              <a href="${rideLink}" style="display:inline-block;padding:12px 16px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;">
                Open Ride
              </a>
            </p>
            <p style="color:#6B7280;font-size:12px;">If the button doesn't work, copy and paste this link: ${rideLink}</p>
          ` : ''}
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Search alert email sent to:', toEmail);
  } catch (error) {
    console.error('Error sending search alert match email:', error);
  }
};

exports.sendRideInviteEmail = async ({
  toEmail,
  inviterUsername,
  ride,
  inviteLink
}) => {
  try {
    const subject = 'You have been invited to join a ride';
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${subject}</h2>
          <p><strong>${inviterUsername}</strong> invited you to view/join a ride.</p>
          <h3>Ride Details</h3>
          <ul>
            <li><strong>From:</strong> ${ride.startLocation}</li>
            <li><strong>To:</strong> ${ride.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(ride.rideDateTime).toLocaleString()}</li>
            <li><strong>Price per seat:</strong> ₹${ride.pricePerSeat || 0}</li>
            <li><strong>Available seats:</strong> ${ride.availableSeats} / ${ride.totalSeats}</li>
          </ul>
          <p>
            <a href="${inviteLink}" style="display:inline-block;padding:12px 16px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;">
              Open Ride
            </a>
          </p>
          <p style="color:#6B7280;font-size:12px;">If the button doesn't work, copy and paste this link: ${inviteLink}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Ride invite email sent to:', toEmail);
  } catch (error) {
    console.error('Error sending ride invite email:', error);
  }
};

exports.sendRideUpdatedEmail = async ({
  participantEmail,
  participantUsername,
  hostUsername,
  rideId,
  changes,
  updatedRide
}) => {
  try {
    const subject = 'Ride Updated by Host';
    const transporter = createTransporter();

    const changesHtml = Array.isArray(changes) && changes.length > 0
      ? `<ul>${changes.map(c => `<li><strong>${c.field}:</strong> ${c.from} → ${c.to}</li>`).join('')}</ul>`
      : '<p>No specific field changes detected.</p>';

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: participantEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${subject}</h2>
          <p>Hi ${participantUsername},</p>
          <p>The host <strong>${hostUsername}</strong> updated the ride you are part of.</p>
          <p><strong>Ride ID:</strong> ${rideId}</p>
          <h3>What changed</h3>
          ${changesHtml}
          <h3>Updated Ride Details</h3>
          <ul>
            <li><strong>From:</strong> ${updatedRide.startLocation}</li>
            <li><strong>To:</strong> ${updatedRide.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(updatedRide.rideDateTime).toLocaleString()}</li>
            <li><strong>Price per seat:</strong> ₹${updatedRide.pricePerSeat || 0}</li>
            <li><strong>Available seats:</strong> ${updatedRide.availableSeats} / ${updatedRide.totalSeats}</li>
          </ul>
          <p>Please check the app for the latest details.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Ride update email sent to participant:', participantEmail);
  } catch (error) {
    console.error('Error sending ride update email:', error);
  }
};

exports.sendRideJoinRequestEmail = async ({
  hostEmail,
  hostUsername,
  riderUsername,
  seatsBooked,
  rideDetails
}) => {
  try {
    const subject = 'New Ride Join Request';
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: hostEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${subject}</h2>
          <p>Hi ${hostUsername},</p>
          <p><strong>${riderUsername}</strong> requested to join your ride.</p>
          <p><strong>Seats requested:</strong> ${seatsBooked}</p>
          <h3>Ride Details:</h3>
          <ul>
            <li><strong>From:</strong> ${rideDetails.startLocation}</li>
            <li><strong>To:</strong> ${rideDetails.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(rideDetails.rideDateTime).toLocaleString()}</li>
          </ul>
          <p>Please review the request in the app and accept/reject it.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Join request email sent to host:', hostEmail);
  } catch (error) {
    console.error('Error sending join request email:', error);
  }
};

exports.sendRideJoinAcceptedEmailToParticipant = async ({
  participantEmail,
  participantUsername,
  seatsBooked,
  totalCost,
  rideDetails,
  hostDetails
}) => {
  try {
    const subject = 'Ride Join Request Accepted';
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: participantEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16A34A;">${subject}</h2>
          <p>Hi ${participantUsername},</p>
          <p>Your request to join the ride has been <strong>accepted</strong>.</p>
          <p><strong>Seats booked:</strong> ${seatsBooked}</p>
          <p><strong>Total cost:</strong> ₹${totalCost}</p>
          <h3>Ride Details:</h3>
          <ul>
            <li><strong>From:</strong> ${rideDetails.startLocation}</li>
            <li><strong>To:</strong> ${rideDetails.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(rideDetails.rideDateTime).toLocaleString()}</li>
          </ul>
          <h3>Host Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${hostDetails.username}</li>
            <li><strong>Email:</strong> ${hostDetails.email}</li>
            <li><strong>Phone:</strong> ${hostDetails.phoneNumber || 'Not provided'}</li>
          </ul>
          <p>Please coordinate with the host for pickup details.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Acceptance email sent to participant:', participantEmail);
  } catch (error) {
    console.error('Error sending acceptance email to participant:', error);
  }
};

exports.sendRideJoinAcceptedEmailToHost = async ({
  hostEmail,
  hostUsername,
  seatsBooked,
  totalCost,
  rideDetails,
  participantDetails
}) => {
  try {
    const subject = 'You Accepted a Ride Participant';
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Campus Wheels" <${process.env.EMAIL_USER}>`,
      to: hostEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${subject}</h2>
          <p>Hi ${hostUsername},</p>
          <p>You accepted <strong>${participantDetails.username}</strong> for your ride.</p>
          <p><strong>Seats booked:</strong> ${seatsBooked}</p>
          <p><strong>Total cost:</strong> ₹${totalCost}</p>
          <h3>Participant Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${participantDetails.username}</li>
            <li><strong>Email:</strong> ${participantDetails.email}</li>
            <li><strong>Phone:</strong> ${participantDetails.phoneNumber || 'Not provided'}</li>
          </ul>
          <h3>Ride Details:</h3>
          <ul>
            <li><strong>From:</strong> ${rideDetails.startLocation}</li>
            <li><strong>To:</strong> ${rideDetails.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(rideDetails.rideDateTime).toLocaleString()}</li>
          </ul>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Acceptance email sent to host:', hostEmail);
  } catch (error) {
    console.error('Error sending acceptance email to host:', error);
  }
};

// Send SOS email
exports.sendSOSEmail = async (sosDetails) => {
  try {
    const emergencyContacts = [
      process.env.SOS_EMAIL_1,
      process.env.SOS_EMAIL_2
    ].filter(Boolean);

    if (emergencyContacts.length === 0) {
      console.warn('No emergency contacts configured');
      return;
    }

    const locationLink = sosDetails.latitude && sosDetails.longitude
      ? `https://www.google.com/maps?q=${sosDetails.latitude},${sosDetails.longitude}`
      : 'Location not available';

    const mailOptions = {
      from: `"D-CARPOOL SOS" <${process.env.EMAIL_USER}>`,
      to: emergencyContacts.join(','),
      subject: '🚨 URGENT: SOS Alert from D-CARPOOL',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #DC2626; padding: 20px;">
          <h1 style="color: #DC2626; text-align: center;">🚨 SOS ALERT 🚨</h1>
          <p style="font-size: 16px; font-weight: bold;">An SOS alert has been triggered on D-CARPOOL.</p>
          
          <h3>User Information:</h3>
          <ul>
            <li><strong>Name:</strong> ${sosDetails.userName}</li>
            <li><strong>Email:</strong> ${sosDetails.userEmail}</li>
            <li><strong>Phone:</strong> ${sosDetails.userPhone || 'Not provided'}</li>
          </ul>

          <h3>Driver Information:</h3>
          <ul>
            <li><strong>Name:</strong> ${sosDetails.driverName}</li>
            <li><strong>Phone:</strong> ${sosDetails.driverPhone || 'Not provided'}</li>
          </ul>

          <h3>Ride Details:</h3>
          <ul>
            <li><strong>From:</strong> ${sosDetails.rideDetails.startLocation}</li>
            <li><strong>To:</strong> ${sosDetails.rideDetails.endLocation}</li>
            <li><strong>Scheduled Time:</strong> ${new Date(sosDetails.rideDetails.rideDateTime).toLocaleString()}</li>
          </ul>

          <h3>Current Location:</h3>
          <p>${sosDetails.currentLocation || 'Not provided'}</p>
          ${sosDetails.latitude && sosDetails.longitude ? 
            `<p><a href="${locationLink}" style="color: #DC2626; font-weight: bold;">View on Google Maps</a></p>` : ''}

          ${sosDetails.message ? `
          <h3>Message:</h3>
          <p style="background-color: #FEE2E2; padding: 10px; border-radius: 5px;">${sosDetails.message}</p>
          ` : ''}

          <h3>Alert Details:</h3>
          <ul>
            <li><strong>Alert ID:</strong> ${sosDetails.alertId}</li>
            <li><strong>Timestamp:</strong> ${new Date(sosDetails.timestamp).toLocaleString()}</li>
          </ul>

          <p style="color: #DC2626; font-weight: bold; margin-top: 20px;">
            Please take immediate action and contact the user or local authorities if necessary.
          </p>
        </div>
      `
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log('SOS email sent to emergency contacts');
  } catch (error) {
    console.error('Error sending SOS email:', error);
    throw error;
  }
};

// Send ride notification
exports.sendRideNotification = async (email, username, rideDetails, type) => {
  try {
    let subject, message;

    switch (type) {
      case 'joined':
        subject = 'Ride Joined Successfully';
        message = `You have successfully joined a ride from ${rideDetails.startLocation} to ${rideDetails.endLocation}.`;
        break;
      case 'cancelled':
        subject = 'Ride Cancelled';
        message = `The ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} has been cancelled.`;
        break;
      case 'completed':
        subject = 'Ride Completed';
        message = `Your ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} has been completed. Please rate your experience!`;
        break;
      default:
        return;
    }

    const mailOptions = {
      from: `"D-CARPOOL" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">${subject}</h2>
          <p>Hi ${username},</p>
          <p>${message}</p>
          <h3>Ride Details:</h3>
          <ul>
            <li><strong>From:</strong> ${rideDetails.startLocation}</li>
            <li><strong>To:</strong> ${rideDetails.endLocation}</li>
            <li><strong>Date & Time:</strong> ${new Date(rideDetails.rideDateTime).toLocaleString()}</li>
          </ul>
          <p>Thank you for using D-CARPOOL!</p>
        </div>
      `
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`${type} notification sent to:`, email);
  } catch (error) {
    console.error('Error sending ride notification:', error);
  }
};
