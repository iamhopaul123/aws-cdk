/// !cdk-integ *
import cdk = require('@aws-cdk/core');
import ec2 = require("../lib");

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-cdk-ec2-import');

/// !show
const vpc = ec2.Vpc.fromLookup(stack, 'VPC', {
  // This imports the default VPC but you can also
  // specify a 'vpcName' or 'tags'.
  isDefault: true
});
/// !hide

// The only thing in this library that takes a VPC as an argument :)
new ec2.SecurityGroup(stack, 'SecurityGroup', {
  vpc
});

// Try subnet selection
new cdk.CfnOutput(stack, 'PublicSubnets', { value: 'ids:' + vpc.publicSubnets.map(s => s.subnetId).join(',') });
new cdk.CfnOutput(stack, 'PrivateSubnets', { value: 'ids:' + vpc.privateSubnets.map(s => s.subnetId).join(',') });

app.synth();
