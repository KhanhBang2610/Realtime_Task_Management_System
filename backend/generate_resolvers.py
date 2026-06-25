import yaml

resolvers = [
    ('Query', 'getMyProfile', 'UserManagerLambda'),
    ('Query', 'getUserById', 'UserManagerLambda'),
    ('Mutation', 'createUserProfile', 'UserManagerLambda'),
    ('Mutation', 'updateUserProfile', 'UserManagerLambda'),

    ('Query', 'getBoard', 'BoardManagerLambda'),
    ('Query', 'listMyBoards', 'BoardManagerLambda'),
    ('Mutation', 'createBoard', 'BoardManagerLambda'),
    ('Mutation', 'updateBoard', 'BoardManagerLambda'),
    ('Mutation', 'deleteBoard', 'BoardManagerLambda'),
    ('Mutation', 'inviteMember', 'BoardManagerLambda'),
    ('Mutation', 'removeMember', 'BoardManagerLambda'),

    ('Query', 'getTask', 'TaskProcessorLambda'),
    ('Query', 'listTasksByBoard', 'TaskProcessorLambda'),
    ('Query', 'listMyAssignedTasks', 'TaskProcessorLambda'),
    ('Mutation', 'createTask', 'TaskProcessorLambda'),
    ('Mutation', 'updateTask', 'TaskProcessorLambda'),
    ('Mutation', 'moveTask', 'TaskProcessorLambda'),
    ('Mutation', 'deleteTask', 'TaskProcessorLambda'),
]

template_addition = "\n"

for type_name, field_name, ds_name in resolvers:
    res_name = f"{type_name}{field_name.capitalize()}Resolver"
    template_addition += f"""
  {res_name}:
    Type: AWS::AppSync::Resolver
    Properties:
      ApiId: !GetAtt AppSyncApi.ApiId
      TypeName: {type_name}
      FieldName: {field_name}
      DataSourceName: !GetAtt {ds_name}.Name
"""

with open('template.yaml', 'a') as f:
    f.write(template_addition)
