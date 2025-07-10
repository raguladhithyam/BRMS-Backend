import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';

interface CertificateAttributes {
  id: string;
  donorId: string;
  requestId: string;
  certificateNumber: string;
  donorName: string;
  bloodGroup: string;
  donationDate: Date;
  hospitalName: string;
  units: number;
  status: 'pending' | 'approved' | 'generated';
  adminApprovedAt?: Date;
  generatedAt?: Date;
  certificateUrl?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CertificateCreationAttributes extends Optional<CertificateAttributes, 'id' | 'certificateNumber' | 'status' | 'createdAt' | 'updatedAt'> {}

class Certificate extends Model<CertificateAttributes, CertificateCreationAttributes> implements CertificateAttributes {
  public id!: string;
  public donorId!: string;
  public requestId!: string;
  public certificateNumber!: string;
  public donorName!: string;
  public bloodGroup!: string;
  public donationDate!: Date;
  public hospitalName!: string;
  public units!: number;
  public status!: 'pending' | 'approved' | 'generated';
  public adminApprovedAt?: Date;
  public generatedAt?: Date;
  public certificateUrl?: string;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Generate certificate number
  public static async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await Certificate.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(year, 0, 1),
          [Op.lt]: new Date(year + 1, 0, 1),
        }
      }
    });
    return `CERT-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }
}

Certificate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    donorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'blood_requests',
        key: 'id',
      },
    },
    certificateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    donorName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: false,
    },
    donationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    hospitalName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 200],
      },
    },
    units: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'generated'),
      allowNull: false,
      defaultValue: 'pending',
    },
    adminApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    certificateUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Certificate',
    tableName: 'certificates',
    hooks: {
      beforeCreate: async (certificate: Certificate) => {
        if (!certificate.certificateNumber) {
          certificate.certificateNumber = await Certificate.generateCertificateNumber();
        }
      },
    },
  }
);

export { Certificate }; 