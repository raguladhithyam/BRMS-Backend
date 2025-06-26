import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'student';
  bloodGroup?: string;
  rollNo?: string;
  phone?: string;
  availability?: boolean;
  lastDonationDate?: Date;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'student';
  public bloodGroup?: string;
  public rollNo?: string;
  public phone?: string;
  public availability?: boolean;
  public lastDonationDate?: Date;
  public lastLogin?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public toJSON(): object {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }

  // Check if user is available for donation (3 months since last donation)
  public isAvailableForDonation(): boolean {
    if (!this.lastDonationDate) return true;
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return this.lastDonationDate <= threeMonthsAgo;
  }

  // Get next available donation date
  public getNextAvailableDonationDate(): Date | null {
    if (!this.lastDonationDate) return null;
    
    const nextDate = new Date(this.lastDonationDate);
    nextDate.setMonth(nextDate.getMonth() + 3);
    
    return nextDate;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'student'),
      allowNull: false,
      defaultValue: 'student',
    },
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true,
    },
    rollNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [10, 15],
      },
    },
    availability: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastDonationDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      afterUpdate: async (user: User) => {
        // Auto-update availability based on donation eligibility
        if (user.role === 'student' && user.changed('lastDonationDate')) {
          const isAvailable = user.isAvailableForDonation();
          if (user.availability !== isAvailable) {
            await user.update({ availability: isAvailable }, { hooks: false });
          }
        }
      },
    },
  }
);

export { User };