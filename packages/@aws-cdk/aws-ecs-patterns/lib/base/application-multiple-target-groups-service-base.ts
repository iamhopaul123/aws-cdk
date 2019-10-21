import { DnsValidatedCertificate, ICertificate } from '@aws-cdk/aws-certificatemanager';
import { IVpc } from '@aws-cdk/aws-ec2';
import { AwsLogDriver, CloudMapOptions, Cluster, ICluster, PropagatedTagSource, Protocol } from '@aws-cdk/aws-ecs';
import { ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol } from '@aws-cdk/aws-elasticloadbalancingv2';
import { AddressRecordTarget, ARecord, IHostedZone } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import cdk = require('@aws-cdk/core');
import { ApplicationLoadBalancedTaskImageOptions } from './application-load-balanced-service-base';

/**
 * The properties for the base ApplicationMultipleTargetGroupsEc2Service or ApplicationMultipleTargetGroupsFargateService service.
 */
export interface ApplicationMultipleTargetGroupsServiceBaseProps {
  /**
   * The name of the cluster that hosts the service.
   *
   * If a cluster is specified, the vpc construct should be omitted. Alternatively, you can omit both cluster and vpc.
   * @default - create a new cluster; if both cluster and vpc are omitted, a new VPC will be created for you.
   */
  readonly cluster?: ICluster;

  /**
   * The VPC where the container instances will be launched or the elastic network interfaces (ENIs) will be deployed.
   *
   * If a vpc is specified, the cluster construct should be omitted. Alternatively, you can omit both vpc and cluster.
   * @default - uses the VPC defined in the cluster or creates a new VPC.
   */
  readonly vpc?: IVpc;

   /**
   * The properties required to create a new task definition. TaskDefinition or TaskImageOptions must be specified, but not both.
   *
   * @default none
   */
  readonly taskImageOptions?: ApplicationLoadBalancedTaskImageOptions;

  /**
   * The desired number of instantiations of the task definition to keep running on the service.
   *
   * @default 1
   */
  readonly desiredCount?: number;

  /**
   * The period of time, in seconds, that the Amazon ECS service scheduler ignores unhealthy
   * Elastic Load Balancing target health checks after a task has first started.
   *
   * @default - defaults to 60 seconds if at least one load balancer is in-use and it is not already set
   */
  readonly healthCheckGracePeriod?: cdk.Duration;

  /**
   * The name of the service.
   *
   * @default - CloudFormation-generated name.
   */
  readonly serviceName?: string;

  /**
   * The application load balancer that will serve traffic to the service. At least one load balancer should be specified.
   *
   * @default - a new load balancer will be created.
   */
  readonly loadBalancers?: ApplicationLoadBalancerProps[];

  /**
   * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service.
   * Tags can only be propagated to the tasks within the service during service creation.
   *
   * @default - none
   */
  readonly propagateTags?: PropagatedTagSource;

  /**
   * Specifies whether to enable Amazon ECS managed tags for the tasks within the service. For more information, see
   * [Tagging Your Amazon ECS Resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)
   *
   * @default false
   */
  readonly enableECSManagedTags?: boolean;

  /**
   * The options for configuring an Amazon ECS service to use service discovery.
   *
   * @default - AWS Cloud Map service discovery is not enabled.
   */
  readonly cloudMapOptions?: CloudMapOptions;

  /**
   * Properties to specify ECS target groups. At least one target group should be specified.
   *
   * @default - default portMapping registered as
   * target group and attached to the first defined listener
   */
  readonly targetGroups?: ApplicationTargetProps[];
}

export interface ApplicationTargetProps {
  /**
   * The port number of the container. Only applicable when using application/network load balancers.
   */
  readonly containerPort: number;

  /**
   * The protocol used for the port mapping. Only applicable when using application load balancers.
   *
   * @default ecs.Protocol.TCP
   */
  readonly protocol?: Protocol;

  /**
   * Name of the listener the target group attached to.
   *
   * @default - default listener (first added listener)
   */
  readonly listener?: string;

  /**
   * Priority of this target group
   *
   * The rule with the lowest priority will be used for every request.
   * If priority is not given, these target groups will be added as
   * defaults, and must not have conditions.
   *
   * Priorities must be unique.
   *
   * @default Target groups are used as defaults
   */
  readonly priority?: number;

  /**
   * Rule applies if the requested host matches the indicated host
   *
   * May contain up to three '*' wildcards.
   *
   * Requires that priority is set.
   *
   * @see https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html#host-conditions
   *
   * @default No host condition
   */
  readonly hostHeader?: string;

  /**
   * Rule applies if the requested path matches the given path pattern
   *
   * May contain up to three '*' wildcards.
   *
   * Requires that priority is set.
   *
   * @see https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html#path-conditions
   *
   * @default No path condition
   */
  readonly pathPattern?: string;
}

export interface ApplicationLoadBalancerProps {
  /**
   * Name of the load balancer (required if loadBalancer is not specified)
   *
   * Note that this field will be ignored if loadBalancer is set.
   */
  readonly name?: string;

  /**
   * Listeners (at least one listener) that attached to this load balancer (required if loadBalancer is not specified)
   *
   * Note that this field will be ignored if loadBalancer is set.
   *
   * @default - none
   */
  readonly listeners?: ApplicationListenerProps[];

  /**
   * Determines whether the Load Balancer will be internet-facing.
   *
   * Note that this field will be ignored if loadBalancer is set.
   *
   * @default true
   */
  readonly publicLoadBalancer?: boolean;

  /**
   * The protocol for connections from clients to the load balancer.
   * The load balancer port is determined from the protocol (port 80 for
   * HTTP, port 443 for HTTPS).  A domain name and zone must be also be
   * specified if using HTTPS.
   *
   * @default ApplicationProtocol.HTTP. If a certificate is specified, the protocol will be
   * set by default to ApplicationProtocol.HTTPS.
   */
  readonly protocol?: ApplicationProtocol;

  /**
   * The domain name for the service, e.g. "api.example.com."
   *
   * @default - No domain name.
   */
  readonly domainName?: string;

  /**
   * The Route53 hosted zone for the domain, e.g. "example.com."
   *
   * @default - No Route53 hosted domain zone.
   */
  readonly domainZone?: IHostedZone;

  /**
   * The application load balancer that will serve traffic to the service.
   *
   * [disable-awslint:ref-via-interface]
   *
   * @default - a new load balancer will be created.
   */
  readonly loadBalancer?: ApplicationLoadBalancer;
}

export interface ApplicationListenerProps {
  /**
   * Name of the listener
   */
  readonly name: string;

  /**
   * Certificate Manager certificate to associate with the load balancer.
   * Setting this option will set the load balancer protocol to HTTPS.
   *
   * @default - No certificate associated with the load balancer, if using
   * the HTTP protocol. For HTTPS, a DNS-validated certificate will be
   * created for the load balancer's specified domain name.
   */
  readonly certificate?: ICertificate;
}

export interface ListenerOptions {
  /**
   * Name of the listener
   */
  readonly name: string;

  /**
   * The listener for the service
   */
  readonly listener: ApplicationListener;
}

/**
 * The base class for ApplicationMultipleTargetGroupsEc2Service and ApplicationMultipleTargetGroupsFargateService services.
 */
export abstract class ApplicationMultipleTargetGroupsServiceBase extends cdk.Construct {

  /**
   * The desired number of instantiations of the task definition to keep running on the service.
   */
  public readonly desiredCount: number;

  /**
   * The default Application Load Balancer for the service (first added load balancer).
   */
  public readonly loadBalancer: ApplicationLoadBalancer;

  /**
   * The default listener for the service (first added listener).
   */
  public readonly listener: ApplicationListener;

  /**
   * The cluster that hosts the service.
   */
  public readonly cluster: ICluster;

  protected listeners = new Array<ListenerOptions>();

  /**
   * Constructs a new instance of the ApplicationMultipleTargetGroupsServiceBase class.
   */
  constructor(scope: cdk.Construct, id: string, props: ApplicationMultipleTargetGroupsServiceBaseProps = {}) {
    super(scope, id);

    this.validateInput(props);

    this.cluster = props.cluster || this.getDefaultCluster(this, props.vpc);
    this.desiredCount = props.desiredCount || 1;

    if (props.loadBalancers) {
      let loadBalancerTemp;
      let listenerTemp;
      for (const lbProps of props.loadBalancers) {
        const lb = this.createLoadBalancer(lbProps.name, lbProps.publicLoadBalancer, lbProps.loadBalancer);
        loadBalancerTemp = loadBalancerTemp || lb;
        if (lbProps.listeners) {
          for (const listenerProps of lbProps.listeners) {
            const protocol = this.createListenerProtocol(lbProps.protocol, listenerProps.certificate);
            const options = this.configListener(protocol, {
              certificate: listenerProps.certificate,
              domainName: lbProps.domainName,
              domainZone: lbProps.domainZone,
              listenerName: listenerProps.name,
              loadBalancer: lb,
            });
            this.listeners.push({
              name: listenerProps.name,
              listener: options.listener
            });
            listenerTemp = listenerTemp || options.listener;
          }
        }
        const domainName = this.createDomainName(lb, lbProps.domainName, lbProps.domainZone);
        new cdk.CfnOutput(this, `LoadBalancerDNS${lb.node.id}`, { value: lb.loadBalancerDnsName });
        new cdk.CfnOutput(this, `ServiceURL${lb.node.id}`, { value: (lbProps.protocol || ApplicationProtocol.HTTP).toLowerCase() + '://' + domainName });
      }
      if (!loadBalancerTemp) {
        throw new Error('At least one load balancer should be specified');
      }
      this.loadBalancer = loadBalancerTemp;
      if (!listenerTemp) {
        throw new Error('At least one listener should be specified');
      }
      this.listener = listenerTemp;
    } else {
      this.loadBalancer = this.createLoadBalancer('LB');
      const protocol = this.createListenerProtocol();
      const options = this.configListener(protocol, {
        listenerName: "PublicListener",
        loadBalancer: this.loadBalancer,
      });
      this.listener = options.listener;
      const domainName = this.createDomainName(this.loadBalancer);

      new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: this.loadBalancer.loadBalancerDnsName });
      new cdk.CfnOutput(this, 'ServiceURL', { value: protocol.toLowerCase() + '://' + domainName });
    }
  }

    /**
   * Returns the default cluster.
   */
  protected getDefaultCluster(scope: cdk.Construct, vpc?: IVpc): Cluster {
    // magic string to avoid collision with user-defined constructs
    const DEFAULT_CLUSTER_ID = `EcsDefaultClusterMnL3mNNYN${vpc ? vpc.node.id : ''}`;
    const stack = cdk.Stack.of(scope);
    return stack.node.tryFindChild(DEFAULT_CLUSTER_ID) as Cluster || new Cluster(stack, DEFAULT_CLUSTER_ID, { vpc });
  }

  protected createAWSLogDriver(prefix: string): AwsLogDriver {
    return new AwsLogDriver({ streamPrefix: prefix });
  }

  protected findListener(name?: string): ApplicationListener {
    if (!name) {
      return this.listener;
    }
    for (const option of this.listeners) {
      if (option.name === name) {
        return option.listener;
      }
    }
    throw new Error(`Listener ${name} is not defined. Did you define listener with name ${name}?`);
  }

  private configListener(protocol: ApplicationProtocol, props: ListenerConfig): ExposedListenerProperties {
    const listener = this.createListener(props.listenerName, props.loadBalancer, protocol);
    let certificate;
    if (protocol === ApplicationProtocol.HTTPS) {
      certificate = this.createListenerCertificate(props.certificate, props.domainName, props.domainZone);
    } else {
      certificate = undefined;
    }
    if (certificate !== undefined) {
      listener.addCertificateArns('Arns', [certificate.certificateArn]);
    }

    return {
      certificate,
      listener,
    };
  }

  private validateInput(props: ApplicationMultipleTargetGroupsServiceBaseProps) {
    if (props.cluster && props.vpc) {
      throw new Error('You can only specify either vpc or cluster. Alternatively, you can leave both blank');
    }
  }

  private createLoadBalancer(name?: string, publicLoadBalancer?: boolean, loadBalancer?: ApplicationLoadBalancer): ApplicationLoadBalancer {
    if (loadBalancer) {
      return loadBalancer;
    }
    if (!name) {
      throw new Error("Name of the new load balancer is required.");
    }
    const internetFacing = publicLoadBalancer !== undefined ? publicLoadBalancer : true;
    const lbProps = {
      vpc: this.cluster.vpc,
      internetFacing
    };

    return new ApplicationLoadBalancer(this, name, lbProps);
  }

  private createListenerProtocol(listenerProtocol?: ApplicationProtocol, certificate?: ICertificate): ApplicationProtocol {
    return listenerProtocol !== undefined ? listenerProtocol : (certificate ? ApplicationProtocol.HTTPS : ApplicationProtocol.HTTP);
  }

  private createListenerCertificate(certificate?: ICertificate, domainName?: string, domainZone?: IHostedZone): ICertificate {
    if (typeof domainName === 'undefined' || typeof domainZone === 'undefined') {
      throw new Error('A domain name and zone is required when using the HTTPS protocol');
    }

    if (certificate !== undefined) {
      return certificate;
    } else {
      return new DnsValidatedCertificate(this, 'Certificate', {
        domainName,
        hostedZone: domainZone
      });
    }
  }

  private createListener(name: string, lb: ApplicationLoadBalancer, protocol?: ApplicationProtocol): ApplicationListener {
    return lb.addListener(name, {
      protocol,
      open: true
    });
  }

  private createDomainName(loadBalancer: ApplicationLoadBalancer, name?: string, zone?: IHostedZone): string {
    let domainName = loadBalancer.loadBalancerDnsName;
    if (typeof name !== 'undefined') {
      if (typeof zone === 'undefined') {
        throw new Error('A Route53 hosted domain zone name is required to configure the specified domain name');
      }

      const record = new ARecord(this, "DNS", {
        zone,
        recordName: name,
        target: AddressRecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer)),
      });

      domainName = record.domainName;
    }
    return domainName;
  }
}

interface ListenerConfig {
  readonly listenerName: string;
  readonly loadBalancer: ApplicationLoadBalancer;
  readonly certificate?: ICertificate;
  readonly domainName?: string;
  readonly domainZone?: IHostedZone;
}

interface ExposedListenerProperties {
  readonly listener: ApplicationListener;
  readonly certificate?: ICertificate;
}
