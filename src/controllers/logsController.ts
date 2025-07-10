import { Request, Response } from 'express';
import { SystemLog } from '../models/SystemLog';
import { Op } from 'sequelize';

export const getSystemLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      level,
      user,
      startDate,
      endDate,
      search,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    if (level) {
      whereClause.level = level;
    }
    if (user) {
      whereClause.user = { [Op.iLike]: `%${user}%` };
    }
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.timestamp[Op.lte] = new Date(endDate as string);
      }
    }
    if (search) {
      whereClause.message = { [Op.iLike]: `%${search}%` };
    }
    // Exclude /api/logs requests
    whereClause.message = whereClause.message
      ? { [Op.and]: [whereClause.message, { [Op.notILike]: '%/api/logs%' }] }
      : { [Op.notILike]: '%/api/logs%' };

    const { count, rows } = await SystemLog.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        data: rows,
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getLogStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Exclude /api/logs requests
    const whereClause = { message: { [Op.notILike]: '%/api/logs%' } };
    const totalLogs = await SystemLog.count({ where: whereClause });
    const errorLogs = await SystemLog.count({ where: { ...whereClause, level: 'ERROR' } });
    const warnLogs = await SystemLog.count({ where: { ...whereClause, level: 'WARN' } });
    const infoLogs = await SystemLog.count({ where: { ...whereClause, level: 'INFO' } });
    const debugLogs = await SystemLog.count({ where: { ...whereClause, level: 'DEBUG' } });
    res.json({
      success: true,
      data: {
        totalLogs,
        errorLogs,
        warnLogs,
        infoLogs,
        debugLogs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const exportLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const whereClause: any = { message: { [Op.notILike]: '%/api/logs%' } };
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.timestamp[Op.lte] = new Date(endDate as string);
      }
    }
    const logs = await SystemLog.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=system-logs.csv');
      const csvHeader = 'Time,Level,User,Message\n';
      const csvContent = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleString();
        return `"${time}","${log.level}","${log.user}","${log.message.replace(/"/g, '""')}"`;
      }).join('\n');
      res.send(csvHeader + csvContent);
    } else {
      res.json({
        success: true,
        data: logs,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}; 