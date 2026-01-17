#!/bin/bash
set -e

sed -i "s#{{.ALIYUN_ACCESS_KEY}}#${ALIYUN_ACCESS_KEY}#g" deploy/${ENV}/config.json
sed -i "s#{{.ALIYUN_ACCESS_SECRET}}#${ALIYUN_ACCESS_SECRET}#g" deploy/${ENV}/config.json

echo "${ALICLOUD_ACK_CLUSTER_CONFIG}" > deploy/${ENV}/kubeconfig.yaml

cp deploy/${ENV}/config.json configs/browser/config.json
cp deploy/${ENV}/kubeconfig.yaml configs/browser/kubeconfig.yaml

docker buildx build \
  --build-arg SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY}" \
  --build-arg ENV="${ENV}" \
  --push \
  -f Dockerfile -t ${IMAGE_VERSION} .

sed -i "s#{{.ENV}}#${ENV}#g" deploy/${ENV}/deployment.yaml
sed -i "s#{{.IMAGE_VERSION}}#${IMAGE_VERSION}#g" deploy/${ENV}/deployment.yaml
sed -i "s#{{.APP_NAME}}#${APP_NAME}#g" deploy/${ENV}/deployment.yaml

sed -i "s#{{.ENV}}#${ENV}#g" deploy/${ENV}/service.yaml
sed -i "s#{{.APP_NAME}}#${APP_NAME}#g" deploy/${ENV}/service.yaml

mkdir -p ~/.kube
echo "${ALICLOUD_ACK_CLUSTER_CONFIG}" > ~/.kube/config
export KUBECONFIG=~/.kube/config

if kubectl get secret acr-secret -n ${ENV} &> /dev/null; then
    echo "Secret acr-secret already exists in the default namespace. Skipping creation."
else
  kubectl create secret docker-registry acr-secret \
    --docker-server=${ALICLOUD_ACR_REGISTRY} \
    --docker-username=${ALICLOUD_USERNAME} \
    --docker-password=${ALICLOUD_PASSWORD} \
    --namespace=${ENV}
fi

kubectl apply -f deploy/${ENV}/deployment.yaml
kubectl apply -f deploy/${ENV}/service.yaml

echo "deployments:"
kubectl get deployments -n ${ENV}
echo "pods:"
kubectl get pods -n ${ENV}
echo "services:"
kubectl get services -n ${ENV}
