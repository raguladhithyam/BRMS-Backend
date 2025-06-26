import { Notification } from '../models/Notification';

interface CreateNotificationData {
  userId: string;
  type: 'request_created' | 'request_approved' | 'student_opted_in' | 'donor_assigned';
  title: string;
  message: string;
  metadata?: object;
}

export const createNotification = async (data: CreateNotificationData): Promise<Notification> => {
  try {
    const notification = await Notification.create(data);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

export const createBulkNotifications = async (notifications: CreateNotificationData[]): Promise<void> => {
  try {
    await Notification.bulkCreate(notifications);
  } catch (error) {
    console.error('Create bulk notifications error:', error);
    throw error;
  }
};