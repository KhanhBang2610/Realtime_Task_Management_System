const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_eYQym9Hoc',
      userPoolClientId: '70ffbeae6sv46uq7o9782pinar',
    }
  },
  API: {
    GraphQL: {
      endpoint: 'https://i5edfg5o2vhr7a2mrvhvuomyqy.appsync-api.ap-southeast-1.amazonaws.com/graphql',
      region: 'ap-southeast-1',
      defaultAuthMode: 'userPool'
    }
  }
};

export default awsconfig;
