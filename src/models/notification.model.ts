import { DataTypes, ModelDefined, Optional } from "sequelize";
import { sequelize } from "@app/server/database";
import { INotificationDocument } from "@app/interfaces/notification.interface";
import { UserModel } from "./user.model";

type NotificationCreationAttributes = Optional<INotificationDocument, 'id' | 'createdAt'>

const NotificationModel: ModelDefined<INotificationDocument, NotificationCreationAttributes> = sequelize.define(
	'notifications',
	{
		//Notice "references". This seems to be how foreign key mapping works for sequelize
		userId: {
			type: DataTypes.INTEGER,
			references: {
				model: UserModel,
				key: 'id'
			}
		},
		groupName: {
			type: DataTypes.STRING,
			allowNull: false
		},
		emails: {
			type: DataTypes.STRING,
			allowNull: false
		},
		createdAt: {
			type: DataTypes.DATE,
			defaultValue: Date.now
		},
	},
	{
		indexes: [
			{
				//not unique b/c user can have multiple notification groups set up
				fields: ['userId']
			}
		]
	}
) as ModelDefined<INotificationDocument, NotificationCreationAttributes>

export { NotificationModel }