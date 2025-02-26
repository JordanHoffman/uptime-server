import { IUserDocument } from "@app/interfaces/user.interface";
import { compare, hash } from "bcryptjs";
import { DataTypes, Model, ModelDefined, Optional } from "sequelize";
import { sequelize } from "@app/server/database";

const SALT_ROUND = 10

/**
 * This is not truly the object prototype as you would use obj.__proto__ to access that. It's basically just a way to add on additional convenience methods.
 */
interface UserModelInstanceMethods extends Model {
	prototype: {
		comparePassword(password: string, hashedPassword: string): Promise<boolean>
		hashPassword(password: string): Promise<string>
	}
}

type UserCreationAttributes = Optional<IUserDocument, 'id' | 'createdAt'>

/**
 * This is basically the structure our db will use for the User table.
 */
const UserModel: ModelDefined<IUserDocument, UserCreationAttributes> & UserModelInstanceMethods = sequelize.define(
	'users',
	{
		username: {
			type: DataTypes.STRING,
			allowNull: false
		},
		password: {
			type: DataTypes.STRING,
			allowNull: true, //google/facebook wouldn't have a p/w, so allow null
		},
		googleId: {
			type: DataTypes.STRING,
			allowNull: true
		},
		facebookId: {
			type: DataTypes.STRING,
			allowNull: true
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false
		},
		//this might come with the db by default. It looks like there's an updatedAt by default too.
		createdAt: {
			type: DataTypes.DATE,
			defaultValue: Date.now
		},
	},
	{
		indexes: [
			{
				unique: true,
				fields: ['email']
			},
			{
				unique: true,
				fields: ['username']
			}
		]
	}
) as ModelDefined<IUserDocument, UserCreationAttributes> & UserModelInstanceMethods

//we'll store a hash of the user's password, not their actual password for safety purposes.
UserModel.addHook('beforeCreate', async (auth: Model) => {
	if (auth.dataValues.password !== undefined) {
		let { dataValues } = auth
		const hashedPassword: string = await hash(dataValues.password, SALT_ROUND)
		dataValues = { ...dataValues, password: hashedPassword}
		auth.dataValues = dataValues
	}
})

UserModel.prototype.comparePassword = async function(password: string, hashedPassword: string): Promise<boolean> {
	return compare(password, hashedPassword)
}

UserModel.prototype.hashPassword = async function(password: string): Promise<string> {
	return hash(password, SALT_ROUND)
}

export { UserModel }