import { ContainerDefinition, Ec2Service, Ec2TaskDefinition, Protocol } from '@aws-cdk/aws-ecs';
import { ApplicationTargetGroup } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Construct } from '@aws-cdk/core';
import { ApplicationLoadBalancedServiceBase, ApplicationLoadBalancedServiceBaseProps,
  ApplicationTargetProps } from '../base/application-load-balanced-service-base';

/**
 * The properties for the ApplicationLoadBalancedEc2Service service.
 */
export interface ApplicationLoadBalancedEc2ServiceProps extends ApplicationLoadBalancedServiceBaseProps {

  /**
   * The task definition to use for tasks in the service. TaskDefinition or TaskImageOptions must be specified, but not both..
   *
   * [disable-awslint:ref-via-interface]
   *
   * @default - none
   */
  readonly taskDefinition?: Ec2TaskDefinition;

  /**
   * The minimum number of CPU units to reserve for the container.
   *
   * Valid values, which determines your range of valid values for the memory parameter:
   *
   * @default - No minimum CPU units reserved.
   */
  readonly cpu?: number;

  /**
   * The amount (in MiB) of memory to present to the container.
   *
   * If your container attempts to exceed the allocated memory, the container
   * is terminated.
   *
   * At least one of memoryLimitMiB and memoryReservationMiB is required for non-Fargate services.
   *
   * @default - No memory limit.
   */
  readonly memoryLimitMiB?: number;

  /**
   * The soft limit (in MiB) of memory to reserve for the container.
   *
   * When system memory is under heavy contention, Docker attempts to keep the
   * container memory to this soft limit. However, your container can consume more
   * memory when it needs to, up to either the hard limit specified with the memory
   * parameter (if applicable), or all of the available memory on the container
   * instance, whichever comes first.
   *
   * At least one of memoryLimitMiB and memoryReservationMiB is required for non-Fargate services.
   *
   * Note that this setting will be ignored if TaskImagesOptions is specified
   *
   * @default - No memory reserved.
   */
  readonly memoryReservationMiB?: number;
}

/**
 * An EC2 service running on an ECS cluster fronted by an application load balancer.
 */
export class ApplicationLoadBalancedEc2Service extends ApplicationLoadBalancedServiceBase {

  /**
   * The EC2 service in this construct.
   */
  public readonly service: Ec2Service;
  /**
   * The EC2 Task Definition in this construct.
   */
  public readonly taskDefinition: Ec2TaskDefinition;
  /**
   * The default target group for the service.
   */
  public readonly targetGroup: ApplicationTargetGroup;

  /**
   * Constructs a new instance of the ApplicationLoadBalancedEc2Service class.
   */
  constructor(scope: Construct, id: string, props: ApplicationLoadBalancedEc2ServiceProps = {}) {
    super(scope, id, props);

    if (props.taskDefinition && props.taskImageOptions) {
      throw new Error('You must specify either a taskDefinition or taskImageOptions, not both.');
    } else if (props.taskDefinition) {
      this.taskDefinition = props.taskDefinition;
    } else if (props.taskImageOptions) {
      const taskImageOptions = props.taskImageOptions;
      this.taskDefinition = new Ec2TaskDefinition(this, 'TaskDef', {
        executionRole: taskImageOptions.executionRole,
        taskRole: taskImageOptions.taskRole
      });

      // Create log driver if logging is enabled
      const enableLogging = taskImageOptions.enableLogging !== undefined ? taskImageOptions.enableLogging : true;
      const logDriver = taskImageOptions.logDriver !== undefined
                          ? taskImageOptions.logDriver : enableLogging
                            ? this.createAWSLogDriver(this.node.id) : undefined;

      const containerName = taskImageOptions.containerName !== undefined ? taskImageOptions.containerName : 'web';
      const container = this.taskDefinition.addContainer(containerName, {
        image: taskImageOptions.image,
        cpu: props.cpu,
        memoryLimitMiB: props.memoryLimitMiB,
        memoryReservationMiB: props.memoryReservationMiB,
        environment: taskImageOptions.environment,
        secrets: taskImageOptions.secrets,
        logging: logDriver,
      });
      container.addPortMappings({
        containerPort: taskImageOptions.containerPort || 80
      });
    } else {
      throw new Error('You must specify one of: taskDefinition or image');
    }
    this.service = this.createEc2Service(props);
    if (this.taskDefinition.defaultContainer && props.targetGroups) {
      this.targetGroup = this.registerECSTargets(this.service, this.taskDefinition.defaultContainer, props.targetGroups);
    } else {
      this.targetGroup = this.listener.addTargets('ECS', {
        targets: [this.service],
        port: 80
      });
    }
  }

  private createEc2Service(props: ApplicationLoadBalancedEc2ServiceProps): Ec2Service {
    return new Ec2Service(this, "Service", {
      cluster: this.cluster,
      desiredCount: this.desiredCount,
      taskDefinition: this.taskDefinition,
      assignPublicIp: false,
      serviceName: props.serviceName,
      healthCheckGracePeriod: props.healthCheckGracePeriod,
      propagateTags: props.propagateTags,
      enableECSManagedTags: props.enableECSManagedTags,
      cloudMapOptions: props.cloudMapOptions,
    });
  }

  private registerECSTargets(service: Ec2Service, container: ContainerDefinition, targets: ApplicationTargetProps[]): ApplicationTargetGroup {
    this.addPortMappingForTargets(container, targets);
    let targetGroup;
    for (const targetProps of targets) {
      const tg = this.findListener(targetProps.listener).addTargets(`ECSTargetGroup${container.containerName}`, {
        port: 80,
        targets: [
          service.loadBalancerTarget({
            containerName: container.containerName,
            containerPort: targetProps.containerPort,
            protocol: targetProps.protocol
          })
        ],
        hostHeader: targetProps.hostHeader,
        pathPattern: targetProps.pathPattern,
        priority: targetProps.priority
      });
      targetGroup = targetGroup || tg;
    }
    if (!targetGroup) {
      throw new Error('At least one target group should be specified.');
    }
    return targetGroup;
  }

  private addPortMappingForTargets(container: ContainerDefinition, targets: ApplicationTargetProps[]) {
    for (const target of targets) {
      if (!container.findPortMapping(target.containerPort, target.protocol || Protocol.TCP)) {
        container.addPortMappings({
          containerPort: target.containerPort,
          protocol: target.protocol
        });
      }
    }
  }
}
